import axios, { AxiosResponse } from 'axios';

// API服务器配置接口
interface ApiServerConfig {
  name: string;
  host: string;
  priority: number;
  region: string;
}

// 服务器测试结果接口
interface ServerTestResult {
  server: ApiServerConfig;
  responseTime: number;
  isSuccess: boolean;
}

// CDN配置接口
interface CdnConfig {
  nodes: ApiServerConfig[];
  config?: {
    timeout?: number;
  };
  backup_url?: string;
}

/**
 * API自动寻路工具类
 * 负责从CDN获取服务器列表，测试服务器响应时间，选择最快的服务器
 */
export class ApiAutoRoute {
  private static cdnConfig: CdnConfig | null = null;
  private static _currentHost: string | null = null;
  private static onRouteChanged: ((host: string) => void) | null = null;
  private static onRouteFailure: (() => void) | null = null;
  private static environment: string = 'production';

  // 默认服务器配置
  private static defaultServers: ApiServerConfig[] = [
    {
      name: 'Default Server 1',
    host: '',
      priority: 1,
      region: 'global',
    }
  ];

  // 备用配置地址列表
  private static backupUrls: string[] = [];

  /**
   * 设置环境
   */
  static setEnvironment(environment: string): void {
    this.environment = environment;
  }

  /**
   * 寻找最快的服务器
   */
  static async findFastestServer(): Promise<string | null> {

    try {
      // 获取服务器列表
      const servers = await this.getServerList();

      if (servers.length === 0) {
        return null;
      }


      // 测试所有服务器
      const results = await this.testServers(servers);

      // 选择最快的服务器
      const fastest = this.selectFastest(results);

      if (fastest) {
        this._currentHost = fastest.host;
        const fastestResult = results.find(r => r.server === fastest);
        return fastest.host;
      } else {
        return null;
      }
    } catch (e) {
      console.error('自动寻路异常:', e);
      return null;
    }
  }

  /**
   * 手动触发一次寻路
   */
  static async manualRoute(): Promise<string | null> {
    return await this.findFastestServer();
  }

  /**
   * 接口请求失败时触发重新寻路
   */
  static async onRequestFailed(): Promise<void> {
    try {
      
      if (this.onRouteFailure) {
        this.onRouteFailure();
      }

      const newHost = await this.findFastestServer();
      if (newHost && newHost !== this._currentHost) {
        if (this.onRouteChanged) {
          this.onRouteChanged(newHost);
        }
      }
    } catch (e) {
      console.error('重新寻路失败:', e);
    }
  }

  /**
   * 设置回调函数
   */
  static setCallbacks(callbacks: {
    onRouteChanged?: (host: string) => void;
    onFailure?: () => void;
  }): void {
    this.onRouteChanged = callbacks.onRouteChanged || null;
    this.onRouteFailure = callbacks.onFailure || null;
  }

  /**
   * 获取当前主机
   */
  static get currentHost(): string | null {
    return this._currentHost;
  }

  /**
   * 获取服务器列表
   */
  private static async getServerList(): Promise<ApiServerConfig[]> {
    // 1. 先尝试默认服务器
    const defaultResults = await this.testServers(this.defaultServers);
    const workingDefaultServers = defaultResults
      .filter(result => result.isSuccess)
      .map(result => result.server);
    
    if (workingDefaultServers.length > 0) {
      return workingDefaultServers;
    }


    // 2. 尝试备用配置
    const backupServers = await this.tryGetServersFromCDN(this.backupUrls, '备用');
    if (backupServers.length > 0) {
      // 更新默认服务器配置
      this.updateDefaultServers(backupServers);
      return backupServers;
    }

    // 3. 所有尝试都失败，返回空列表
    return [];
  }

  /**
   * 更新默认服务器配置
   */
  private static updateDefaultServers(newServers: ApiServerConfig[]): void {
    if (newServers.length >= 2) {
      this.defaultServers.splice(0);
      this.defaultServers.push(
        { ...newServers[0], priority: 1 },
        { ...newServers[1], priority: 2 }
      );
    }
  }

  /**
   * 从CDN获取服务器列表
   */
  private static async tryGetServersFromCDN(
    cdnUrls: string[], 
    cdnType: string
  ): Promise<ApiServerConfig[]> {
    let firstUrlFailed = false;

    for (let i = 0; i < cdnUrls.length; i++) {
      const cdnUrl = cdnUrls[i];
      try {

        const response: AxiosResponse<CdnConfig> = await axios.get(cdnUrl, {
          timeout: 15000,
        });

        if (response.status === 200 && response.data) {

          this.cdnConfig = response.data;
          
          // 只有当第一个地址失败，且是第二个地址成功时才更新地址列表
          if (firstUrlFailed && i === 1 && this.cdnConfig.backup_url) {
            this.updateBackupUrls(this.cdnConfig.backup_url);
          }

          const nodesList = response.data.nodes || [];
          const servers = nodesList.map(node => ({
            name: node.name || 'unknown',
            host: node.host,
            priority: node.priority || 0,
            region: node.region || 'global',
          }));

          if (servers.length > 0) {
            servers.sort((a, b) => a.priority - b.priority);
            return servers;
          }
        }
      } catch (e) {
        if (i === 0) {
          firstUrlFailed = true;
          continue;
        }
      }
    }

    return [];
  }

  /**
   * 更新备用地址列表
   */
  private static updateBackupUrls(newBackupUrl: string): void {
    // 将第二个地址变成第一个
    this.backupUrls[0] = this.backupUrls[1];
    // 新地址变成第二个
    this.backupUrls[1] = newBackupUrl;
  }

  /**
   * 测试服务器速度
   */
  private static async testServers(servers: ApiServerConfig[]): Promise<ServerTestResult[]> {
    const promises = servers.map(server => this.testSingleServer(server));
    return await Promise.all(promises);
  }

  /**
   * 测试单个服务器
   */
  private static async testSingleServer(server: ApiServerConfig): Promise<ServerTestResult> {
    const startTime = Date.now();

    try {
      // 使用CDN配置的超时设置
      let timeoutSeconds = 8;
      if (this.cdnConfig?.config?.timeout) {
        timeoutSeconds = Math.round(this.cdnConfig.config.timeout / 1000);
      }

      // 构建测试URL
      const isIP = /^((2[0-4]\d|25[0-5]|[01]?\d\d?)\.){3}(2[0-4]\d|25[0-5]|[01]?\d\d?)$/.test(server.host);
      const protocol = isIP ? 'http' : 'https';
      const port = isIP ? ':10002' : '';
      const testUrl = `${protocol}://${server.host}${port}/chat/third/network/test/ping`;


      // 准备请求头
      const headers: Record<string, string> = {
        'operationID': String(Date.now()),
        'orgId': 'orgId',
        'source': 'web',
      };

      const response = await axios.get(testUrl, {
        headers,
        timeout: timeoutSeconds * 1000,
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status === 200;


      return {
        server,
        responseTime,
        isSuccess,
      };
    } catch (e) {
      const responseTime = Date.now() - startTime;

      return {
        server,
        responseTime: 99999,
        isSuccess: false,
      };
    }
  }

  /**
   * 选择最快的服务器
   */
  private static selectFastest(results: ServerTestResult[]): ApiServerConfig | null {
    const successResults = results.filter(r => r.isSuccess);

    if (successResults.length === 0) {
      return null;
    }

    successResults.sort((a, b) => a.responseTime - b.responseTime);
    return successResults[0].server;
  }
} 