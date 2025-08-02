// 全局配置管理器
class GlobalConfig {
  private _chatUrl: string = import.meta.env.VITE_CHAT_URL;
  private _apiUrl: string = import.meta.env.VITE_API_URL;
  private _wsUrl: string = import.meta.env.VITE_WS_URL;

  // 获取当前配置的 URL
  get chatUrl(): string {
    return this._chatUrl;
  }

  get apiUrl(): string {
    return this._apiUrl;
  }

  get wsUrl(): string {
    return this._wsUrl;
  }

  // 更新域名配置
  updateDomains(optimalHost: string): void {
    const originalChatUrl = import.meta.env.VITE_CHAT_URL;
    const originalApiUrl = import.meta.env.VITE_API_URL;
    const originalWsUrl = import.meta.env.VITE_WS_URL;

    // 替换为最优域名
    this._chatUrl = originalChatUrl.replace(/https?:\/\/[^/]+/, `https://${optimalHost}`);
    this._apiUrl = originalApiUrl.replace(/https?:\/\/[^/]+/, `https://${optimalHost}`);
    this._wsUrl = originalWsUrl.replace(/wss?:\/\/[^/]+/, `wss://${optimalHost}`);


  }

  // 重置为默认配置
  reset(): void {
    this._chatUrl = import.meta.env.VITE_CHAT_URL;
    this._apiUrl = import.meta.env.VITE_API_URL;
    this._wsUrl = import.meta.env.VITE_WS_URL;
  }
}

// 导出单例实例
export const globalConfig = new GlobalConfig(); 