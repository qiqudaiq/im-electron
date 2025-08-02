import { IMSDK } from "@/layout/MainContentWrap";
import { MessageType } from "@openim/wasm-client-sdk";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Empty, Image, Spin } from "antd";
import { useCommonModal } from "@/pages/common";
import FileDownloadIcon from "@/svg/FileDownloadIcon";
import { getResourceUrl, secondsToMS } from "@/utils/common";

// 🔥 优化：添加视频搜索缓存
const videoSearchCache = new Map<string, {
  thisWeek: any[];
  earlier: any[];
  timestamp: number;
}>();

const CACHE_EXPIRE_TIME = 10 * 60 * 1000; // 10分钟缓存
const VIDEO_SEARCH_LIMIT = 500; // 🔥 优化：从10000减少到500（视频文件更大）

const VideoHistoryPanel: React.FC = () => {
  const { conversationID } = useParams();
  const { showVideoPlayer } = useCommonModal();

  const [thisWeekVideos, setThisWeekVideos] = useState<any[]>([]);
  const [earlierVideos, setEarlierVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVideoList = async () => {
    if (!conversationID) return;

    // 🔥 优化：检查缓存
    const cached = videoSearchCache.get(conversationID);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
      setThisWeekVideos(cached.thisWeek);
      setEarlierVideos(cached.earlier);
      return;
    }

    try {
      setLoading(true);
      
      const res = await IMSDK.searchLocalMessages({
        conversationID: conversationID ?? "",
        keywordList: [],
        messageTypeList: [MessageType.VideoMessage],
        searchTimePosition: 0,
        searchTimePeriod: 0,
        pageIndex: 1,
        count: VIDEO_SEARCH_LIMIT, // 🔥 优化：从10000减少到500
      });


      const messages = res.data?.searchResultItems?.[0]?.messageList || [];

      // 计算本周开始时间（当前时间的前7天）
      const now = new Date();
      const oneWeekAgo = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
      ).getTime();

      // 根据createTime将视频分为本周和更早
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
      videoSearchCache.set(conversationID, {
        thisWeek,
        earlier,
        timestamp: Date.now(),
      });

      setThisWeekVideos(thisWeek);
      setEarlierVideos(earlier);
      setLoading(false);
    } catch (error) {
      console.error("❌ 搜索视频失败:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoList();
    
    // 🔥 优化：清理过期缓存
    const cleanupCache = () => {
      const now = Date.now();
      for (const [key, value] of videoSearchCache.entries()) {
        if (now - value.timestamp > CACHE_EXPIRE_TIME) {
          videoSearchCache.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, CACHE_EXPIRE_TIME);
    return () => clearInterval(interval);
  }, [conversationID]);

  // 渲染视频网格的组件
  const renderVideoGrid = (videos: any[]) => {
    if (videos.length === 0) {
      return <div style={{ color: "#999", padding: "10px 0" }}>暂无视频</div>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
        {videos.map((item) => (
          <div
            key={item.clientMsgId}
            className="relative cursor-pointer"
            style={{
              width: 120,
              height: 120,
              borderRadius: "8px",
              overflow: "hidden",
            }}
            onClick={() => showVideoPlayer(item.videoElem.videoUrl)}
          >
            <Image
              src={getResourceUrl(item.videoElem.snapshotUrl)}
              width={120}
              height={120}
              style={{ objectFit: "cover" }}
              preview={false}
            />
            <div className="absolute bottom-3 right-4 text-white">
              {secondsToMS(item.videoElem.duration)}
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <FileDownloadIcon size={40} finished percent={0} />
            </div>
          </div>
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

  if (earlierVideos.length === 0 && thisWeekVideos.length === 0) {
    return <Empty className="mt-8" />;
  }

  return (
    <div>
      <div>
        <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: "16px" }}>
          本周
        </div>
        {renderVideoGrid(thisWeekVideos)}
      </div>

      {earlierVideos.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ marginBottom: 10, fontWeight: "bold", fontSize: "16px" }}>
            更早
          </div>
          {renderVideoGrid(earlierVideos)}
        </div>
      )}
    </div>
  );
};

export default VideoHistoryPanel;
