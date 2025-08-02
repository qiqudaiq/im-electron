/**
 * 简单的性能监控日志工具
 * 
 * 📦 构建说明：
 * - 开发环境构建(保留console.log): npm run build:dev-debug
 * - 生产环境构建(移除console.log): npm run build:prod
 */

// 获取DOM节点数量
const getDOMNodeCount = (): number => {
  return document.querySelectorAll('*').length;
};



// 获取JS堆内存
const getJSHeapSize = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    };
  }
  return { used: 0, total: 0, limit: 0 };
};

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 主要的性能日志打印函数
export const logPerformanceMetrics = () => {
  const domNodes = getDOMNodeCount();
  const jsHeap = getJSHeapSize();
  const timestamp = new Date().toLocaleTimeString();

  console.group(`📊 性能监控 - ${timestamp}`);
  console.log(`🌐 DOM节点数: ${domNodes.toLocaleString()}`);
  
  
  if (jsHeap.used > 0) {
    console.log(`💾 JS堆内存: ${formatBytes(jsHeap.used)} / ${formatBytes(jsHeap.total)}`);
    console.log(`💾 内存使用率: ${((jsHeap.used / jsHeap.total) * 100).toFixed(1)}%`);
    console.log(`💾 内存限制: ${formatBytes(jsHeap.limit)}`);
  }

  // 额外的运行时信息
  console.log(`⚙️ 环境: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`⚙️ User Agent: ${navigator.userAgent.substring(0, 50)}...`);

  // 性能警告
  const warnings: string[] = [];
  if (domNodes > 10000) {
    warnings.push(`DOM节点过多: ${domNodes.toLocaleString()}`);
  }
  if (jsHeap.used > 0 && (jsHeap.used / jsHeap.total) > 0.8) {
    warnings.push('JS内存使用率过高: >80%');
  }


  if (warnings.length > 0) {
    console.warn('⚠️ 性能警告:');
    warnings.forEach(warning => console.warn(`  ${warning}`));
  } else {
    console.log('✅ 性能状态良好');
  }

  console.groupEnd();
};

// 启动定期性能监控
export const startPerformanceLogging = (intervalMs: number = 15000) => {
  console.log('🔍 启动性能监控...');
  console.log(`📦 当前环境: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`📦 构建说明:`);
  console.log(`📦   开发构建(保留日志): npm run build:dev-debug`);
  console.log(`📦   生产构建(移除日志): npm run build:prod`);
  
  // 立即打印一次
  logPerformanceMetrics();
  
  // 定期打印
  const intervalId = setInterval(logPerformanceMetrics, intervalMs);
  
  // 暴露到全局方便手动调用
  (window as any).logPerformance = logPerformanceMetrics;
  (window as any).stopPerformanceLogging = () => {
    clearInterval(intervalId);
    console.log('🔍 性能监控已停止');
  };
  
  console.log('💡 手动调用: window.logPerformance()');
  console.log('💡 停止监控: window.stopPerformanceLogging()');
  
  return intervalId;
}; 