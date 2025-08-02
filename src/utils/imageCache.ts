/**
 * 图片缓存管理工具
 * 提供多层缓存策略：内存缓存 + URL稳定化 + 可选本地文件缓存
 */

import { getResourceUrl } from './common';

interface CacheItem {
  url: string;
  timestamp: number;
  blob?: Blob;
}

class ImageCacheManager {
  private urlCache = new Map<string, string>();
  private blobCache = new Map<string, CacheItem>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30分钟
  private readonly MAX_BLOB_CACHE_SIZE = 50; // 最多缓存50张图片的blob

  /**
   * 获取稳定的图片URL
   * 对同一个原始路径，总是返回相同的URL
   */
  getStableImageUrl(originalPath: string): string {
    if (!originalPath) return '';

    // 检查内存缓存
    if (this.urlCache.has(originalPath)) {
      return this.urlCache.get(originalPath)!;
    }

    // 生成新的URL并缓存
    const stableUrl = getResourceUrl(originalPath);
    this.urlCache.set(originalPath, stableUrl);
    
    return stableUrl;
  }

  /**
   * 预加载图片并缓存到内存
   */
  async preloadImage(originalPath: string): Promise<string> {
    const stableUrl = this.getStableImageUrl(originalPath);
    
    // 检查blob缓存
    const cached = this.blobCache.get(originalPath);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return URL.createObjectURL(cached.blob!);
    }

    try {
      // 下载图片
      const response = await fetch(stableUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // 清理过期缓存
      this.cleanExpiredCache();
      
      // 控制缓存大小
      if (this.blobCache.size >= this.MAX_BLOB_CACHE_SIZE) {
        const oldestKey = this.blobCache.keys().next().value;
        if (oldestKey) {
          const oldItem = this.blobCache.get(oldestKey);
          if (oldItem?.blob) {
            URL.revokeObjectURL(URL.createObjectURL(oldItem.blob));
          }
          this.blobCache.delete(oldestKey);
        }
      }

      // 缓存新的blob
      this.blobCache.set(originalPath, {
        url: stableUrl,
        timestamp: Date.now(),
        blob
      });

      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('图片预加载失败:', error);
      return stableUrl; // 降级到直接URL
    }
  }

  /**
   * 批量预加载图片
   */
  async batchPreload(paths: string[]): Promise<void> {
    const promises = paths.slice(0, 10).map(path => 
      this.preloadImage(path).catch(console.warn)
    );
    await Promise.allSettled(promises);
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, item] of this.blobCache.entries()) {
      if (now - item.timestamp > this.CACHE_DURATION) {
        if (item.blob) {
          URL.createObjectURL(item.blob);
        }
        this.blobCache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    // 清理blob URLs
    for (const item of this.blobCache.values()) {
      if (item.blob) {
        URL.revokeObjectURL(URL.createObjectURL(item.blob));
      }
    }
    
    this.urlCache.clear();
    this.blobCache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      urlCacheSize: this.urlCache.size,
      blobCacheSize: this.blobCache.size,
      totalMemoryUsage: Array.from(this.blobCache.values())
        .reduce((total, item) => total + (item.blob?.size || 0), 0)
    };
  }
}

// 单例实例
export const imageCache = new ImageCacheManager();

// 清理函数，在页面卸载时调用
export const cleanupImageCache = () => {
  imageCache.clearCache();
};

// 在window卸载时自动清理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupImageCache);
} 