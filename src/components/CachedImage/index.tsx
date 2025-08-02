/**
 * 带缓存的图片组件
 * 使用内存缓存和URL稳定化来减少重复加载
 */

import { Image, Spin } from 'antd';
import { ImageProps } from 'antd/es/image';
import { memo, useEffect, useState, useCallback, SyntheticEvent } from 'react';
import { imageCache } from '@/utils/imageCache';

interface CachedImageProps extends Omit<ImageProps, 'src'> {
  /** 原始图片路径 */
  originalPath: string;
  /** 是否启用预加载 */
  enablePreload?: boolean;
  /** 自定义加载占位符 */
  loadingPlaceholder?: React.ReactNode;
}

const CachedImage: React.FC<CachedImageProps> = memo(({
  originalPath,
  enablePreload = true,
  loadingPlaceholder,
  placeholder,
  onLoad,
  onError,
  ...imageProps
}) => {
  const [displayUrl, setDisplayUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadImage = useCallback(async () => {
    if (!originalPath) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(false);

      if (enablePreload) {
        // 使用预加载和缓存
        const cachedUrl = await imageCache.preloadImage(originalPath);
        setDisplayUrl(cachedUrl);
      } else {
        // 只使用URL稳定化
        const stableUrl = imageCache.getStableImageUrl(originalPath);
        setDisplayUrl(stableUrl);
      }
    } catch (err) {
      console.warn('图片加载失败:', err);
      setError(true);
      // 降级到稳定URL
      const fallbackUrl = imageCache.getStableImageUrl(originalPath);
      setDisplayUrl(fallbackUrl);
    } finally {
      setLoading(false);
    }
  }, [originalPath, enablePreload]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    setError(false);
    onLoad?.(event);
  }, [onLoad]);

  const handleError = useCallback((event: SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    setError(true);
    onError?.(event);
  }, [onError]);

  // 自定义占位符
  const renderPlaceholder = () => {
    if (loadingPlaceholder) {
      return loadingPlaceholder;
    }
    
    if (placeholder) {
      return placeholder;
    }

    return (
      <div 
        className="flex items-center justify-center bg-gray-100"
        style={{ 
          minHeight: '60px',
          minWidth: '60px',
          width: '100%',
          height: '100%'
        }}
      >
        <Spin size="small" />
      </div>
    );
  };

  if (loading || !displayUrl) {
    return renderPlaceholder();
  }

  return (
    <Image
      {...imageProps}
      src={displayUrl}
      onLoad={handleLoad}
      onError={handleError}
      placeholder={error ? (
        <div className="flex items-center justify-center bg-gray-200 text-gray-500">
          加载失败
        </div>
      ) : renderPlaceholder()}
    />
  );
});

CachedImage.displayName = 'CachedImage';

export default CachedImage; 