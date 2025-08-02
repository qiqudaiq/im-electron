import { IMSDK } from "@/layout/MainContentWrap";
import { MessageType } from "@openim/wasm-client-sdk";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Empty, Image, Spin } from "antd";
import { getResourceUrl } from "@/utils/common";

// 🔥 优化：添加图片搜索缓存
const imageSearchCache = new Map<string, {
  thisWeek: any[];
  earlier: any[];
  timestamp: number;
}>();

const CACHE_EXPIRE_TIME = 10 * 60 * 1000; // 10分钟缓存
const IMAGE_SEARCH_LIMIT = 1000; // 🔥 优化：从10000减少到1000

const ImageHistoryPanel: React.FC = () => {
  const { conversationID } = useParams();

  const [thisWeekImages, setThisWeekImages] = useState<any[]>([]);
  const [earlierImages, setEarlierImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImageList = async () => {
    if (!conversationID) return;

    // 🔥 优化：检查缓存
    const cached = imageSearchCache.get(conversationID);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
      setThisWeekImages(cached.thisWeek);
      setEarlierImages(cached.earlier);
      return;
    }

    try {
      setLoading(true);
      
      const res = await IMSDK.searchLocalMessages({
        conversationID: conversationID ?? "",
        keywordList: [],
        messageTypeList: [MessageType.PictureMessage],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: 1,
        count: IMAGE_SEARCH_LIMIT, // 🔥 优化：从10000减少到1000
      });


      const messages = res.data?.searchResultItems?.[0]?.messageList || [];

      // 计算本周开始时间（当前时间的前7天）
      const now = new Date();
      const oneWeekAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
      ).getTime();

      // 根据createTime将图片分为本周和更早
      const thisWeek: any[] = [];
      const earlier: any[] = [];

      messages.forEach((message: any) => {
        if (message.createTime >= oneWeekAgo) {
          thisWeek.push(message);
        } else {
          earlier.push(message);
        }
      });

      // 🔥 优化：设置缓存
      imageSearchCache.set(conversationID, {
        thisWeek,
        earlier,
        timestamp: Date.now(),
      });

      setThisWeekImages(thisWeek);
      setEarlierImages(earlier);
      setLoading(false);
    } catch (error) {
      console.error("❌ 搜索图片失败:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImageList();
    
    // 🔥 优化：清理过期缓存
    const cleanupCache = () => {
      const now = Date.now();
      for (const [key, value] of imageSearchCache.entries()) {
        if (now - value.timestamp > CACHE_EXPIRE_TIME) {
          imageSearchCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, CACHE_EXPIRE_TIME);
    return () => clearInterval(interval);
  }, [conversationID]);

  // 渲染图片网格的组件
  const renderImageGrid = (images: any[]) => {
    if (images.length === 0) {
      return <div style={{ color: "#999", padding: "10px 0" }}>暂无图片</div>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
        {images.map((item) => (
          <Image
            src={getResourceUrl(item.pictureElem.sourcePicture.url)}
            width={80}
            height={80}
            key={item.clientMsgId}
            style={{ borderRadius: "8px", objectFit: "cover" }}
            preview={{ maskClassName: "rounded-preview" }}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin />
      </div>
    );
  }

  if (earlierImages.length === 0 && thisWeekImages.length === 0) {
    return <Empty className="mt-8" />;
  }

  return (
    <div>
      <div>
        <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: "16px" }}>
          本周
        </div>
        {renderImageGrid(thisWeekImages)}
      </div>

      {earlierImages.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: "16px" }}>
            更早
          </div>
          {renderImageGrid(earlierImages)}
        </div>
      )}
    </div>
  );
};

export default ImageHistoryPanel;
