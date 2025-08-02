// 最简化错误捕获系统 - 集成隐私保护
import { filterErrorForUpload, privacyFilter } from './privacyFilter';

interface ErrorInfo {
  timestamp: number;
  type: string;
  message: string;
  stack?: string;
  url?: string;
}

class SimpleErrorCapture {
  // 写入SDK日志目录
  private async writeToSDKLog(errorInfo: ErrorInfo) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const fileName = `APP_ERRORS_${today}.log`;
      const timestamp = new Date(errorInfo.timestamp).toISOString();
      
      // 🔒 隐私保护：过滤敏感信息后再记录
      const filteredErrorInfo = filterErrorForUpload(errorInfo);
      const logEntry = `[${timestamp}] [ERROR] [APP] ${JSON.stringify(filteredErrorInfo)}`;

      if (window.electronAPI?.ipcInvoke) {
        await window.electronAPI.ipcInvoke('write-sdk-app-error-log', { 
          logEntry,
          fileName 
        });
      } else {
        console.error('[APP_ERROR]', logEntry);
      }
      
    } catch (error) {
      // 静默处理
    }
  }

  // 是否应该捕获此错误
  private shouldCapture(message: string): boolean {
    const msg = message.toLowerCase();
    
    // 排除SDK和系统错误
    const excludes = [
      'seq_gap', 'uploadlogs', 'localforage', 'indexeddb', 
      'websocket', 'network error', 'loading chunk', 'script error'
    ];
    
    for (const exclude of excludes) {
      if (msg.includes(exclude)) return false;
    }
    
    // 只捕获明确的应用错误
    const includes = ['typeerror', 'referenceerror', 'syntaxerror', 'business'];
    return includes.some(include => msg.includes(include));
  }

  // 捕获错误
  capture(type: string, message: string, stack?: string, url?: string) {
    if (!this.shouldCapture(message)) return;
    
    this.writeToSDKLog({
      timestamp: Date.now(),
      type,
      message,
      stack,
      url
    });
  }

  // 手动上传SDK日志
  async upload() {
    try {
      const { IMSDK } = await import('@/layout/MainContentWrap');
      await IMSDK.uploadLogs({ line: 1000, ex: '上传应用错误日志' });
      console.log('✅ 错误日志上传成功');
    } catch (error) {
      console.error('❌ 上传失败:', error);
    }
  }
}

const errorCapture = new SimpleErrorCapture();

// 设置全局错误处理器
export const setupGlobalErrorHandlers = () => {
  // JavaScript错误
  window.onerror = (message, source, lineno, colno, error) => {
    errorCapture.capture('javascript', String(message), error?.stack, source || '');
    return false;
  };

  // Promise错误
  window.onunhandledrejection = (event) => {
    errorCapture.capture('promise', String(event.reason?.message || event.reason));
  };

  // 暴露上传方法
  if (typeof window !== 'undefined') {
    (window as any).uploadSDKLogs = () => errorCapture.upload();
  }

  console.log('🛡️ 错误捕获系统已启动');
  return errorCapture;
};

export default errorCapture; 
