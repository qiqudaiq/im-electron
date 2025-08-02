import React from "react";
import { Empty, Spin } from "antd";
import ChatHistoryItem from "./ChatHistoryItem";

interface ChatHistoryListProps {
  loading?: boolean;
  keyword?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onItemClick?: (messageID: string) => void;
  dataSource: any[];
}

const ChatHistoryList: React.FC<ChatHistoryListProps> = ({
  loading = false,
  keyword = "",
  // hasMore = false,
  onLoadMore,
  onItemClick,
  dataSource,
}) => {
  if (loading && dataSource.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spin />
      </div>
    );
  }

  if (dataSource.length === 0) {
    return (
      <Empty
        className="mt-8"
        description={keyword ? "未找到相关聊天记录" : "请输入关键词搜索"}
      />
    );
  }

  return (
    <div className="overflow-scroll">
      <div className="">
        {dataSource.map((item) => (
          <ChatHistoryItem
            key={item.clientMsgID}
            avatar={item.avatar}
            nickname={item.senderNickname}
            content={item.textElem?.content}
            sendTime={item.createTime}
            onClick={() => onItemClick?.(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatHistoryList;
