/**
 * 图片预加载Hook
 * 用于批量预加载消息中的图片，提升用户体验
 */

import { useEffect, useCallback } from 'react';
import { MessageItem, MessageType } from '@openim/wasm-client-sdk';
import { imageCache } from '@/utils/imageCache';

/**
 * 从消息列表中提取图片路径
 */
const extractImagePaths = (messages: MessageItem[]): string[] => {
  const paths: string[] = [];
  
  messages.forEach(message => {
    try {
      switch (message.contentType) {
        case MessageType.PictureMessage:
          // 图片消息
          if (message.pictureElem?.snapshotPicture?.url) {
            paths.push(message.pictureElem.snapshotPicture.url);
          }
          if (message.pictureElem?.sourcePicture?.url) {
            paths.push(message.pictureElem.sourcePicture.url);
          }
          break;
          
        case MessageType.VideoMessage:
          // 视频消息的缩略图
          if (message.videoElem?.snapshotUrl) {
            paths.push(message.videoElem.snapshotUrl);
          }
          break;
          
        case MessageType.FaceMessage:
          // 表情消息
          try {
            const faceData = JSON.parse(message.faceElem?.data || '{}');
            if (faceData.url) {
              paths.push(faceData.url);
            }
          } catch (error) {
            console.warn('解析表情数据失败:', error);
          }
          break;
          
        case MessageType.CustomMessage:
          // 自定义消息可能包含图片
          try {
            const customData = JSON.parse(message.customElem?.data || '{}');
            // 这里可以根据具体的自定义消息类型来提取图片
            if (customData.imageUrl) {
              paths.push(customData.imageUrl);
            }
          } catch (error) {
            // 忽略解析错误
          }
          break;
          
        default:
          break;
      }
    } catch (error) {
      console.warn('提取图片路径失败:', error);
    }
  });
  
  return [...new Set(paths)]; // 去重
};

interface UseImagePreloaderOptions {
  /** 是否启用预加载 */
  enabled?: boolean;
  /** 最大预加载数量 */
  maxPreload?: number;
  /** 预加载延迟（毫秒） */
  delay?: number;
}

/**
 * 图片预加载Hook
 */
export const useImagePreloader = (
  messages: MessageItem[], 
  options: UseImagePreloaderOptions = {}
) => {
  const { 
    enabled = true, 
    maxPreload = 20, 
    delay = 100 
  } = options;

  const preloadImages = useCallback(async () => {
    if (!enabled || !messages.length) return;
    
    try {
      // 提取图片路径
      const imagePaths = extractImagePaths(messages);
      
      if (imagePaths.length === 0) return;
      
      // 限制预加载数量，优先加载最新的图片
      const pathsToPreload = imagePaths
        .slice(0, maxPreload)
        .filter(path => path && path.trim() !== '');
      
      if (pathsToPreload.length > 0) {
        await imageCache.batchPreload(pathsToPreload);
      }
    } catch (error) {
      console.warn('批量预加载图片失败:', error);
    }
  }, [messages, enabled, maxPreload]);

  useEffect(() => {
    if (!enabled) return;
    
    // 延迟执行预加载，避免阻塞主线程
    const timer = setTimeout(preloadImages, delay);
    
    return () => clearTimeout(timer);
  }, [preloadImages, delay, enabled]);

  return {
    preloadImages,
    getCacheStats: () => imageCache.getCacheStats(),
    clearCache: () => imageCache.clearCache()
  };
}; 