import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import {
  FriendUserItem,
  GroupItem,
  SearchMessageResultItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { Empty, Spin } from "antd";
import clsx from "clsx";
import { memo, useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";

import OIMAvatar from "@/components/OIMAvatar";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { IMSDK } from "@/layout/MainContentWrap";
import { formatMessageTime } from "@/utils/imCommon";

import styles from "./index.module.scss";

export const ChatSourceRender = memo(
  ({
    id,
    item,
    onClick,
    isActive,
  }: {
    id?: string;
    item: any;
    onClick: () => void;
    isActive: boolean;
  }) => {
    const messageCount = item.messageList?.length || 0;
    return (
      <div
        id={id}
        className={clsx(
          "mx-2 my-1 flex cursor-pointer items-center rounded px-3 py-2",
          isActive ? "bg-[var(--primary-active)]" : "hover:bg-[var(--primary-active)]",
        )}
        onClick={onClick}
      >
        <OIMAvatar
          src={item.faceURL}
          text={item.showName}
          isgroup={Boolean(item.conversationType === SessionType.Group)}
        />
        <div className="ml-3 flex-1">
          <div className="max-w-[200px] truncate font-medium">{item.showName}</div>
          <div className="text-xs text-gray-500">{messageCount}条相关聊天记录</div>
        </div>
      </div>
    );
  },
);

// 消息内容渲染组件
export const MessageItemRender = memo(({ message }: { message: any }) => {
  // 获取消息内容
  const getMessageContent = (message: any) => {
    if (message.textElem?.content) {
      return message.textElem.content;
    }

    switch (message.contentType) {
      case MessageType.TextMessage:
      case MessageType.AtTextMessage:
        return message.textElem?.content || "文本消息";
      case MessageType.PictureMessage:
        return "[图片]";
      case MessageType.VideoMessage:
        return "[视频]";
      case MessageType.FileMessage:
        return "[文件]";
      case MessageType.VoiceMessage:
        return "[语音]";
      case MessageType.LocationMessage:
        return "[位置]";
      default:
        return "未知消息类型";
    }
  };

  return (
    <div
      className={clsx(
        "mx-2 my-1 flex items-start rounded  p-3",
        "hover:bg-[var(--primary-active)]",
      )}
    >
      <OIMAvatar
        src={message.senderFaceURL}
        text={message.senderNickname || message.sendID?.substring(0, 2)}
        size={36}
      />
      <div className="ml-3 min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {message.senderNickname || message.sendID}
          </span>
          <span className="text-xs text-gray-400">
            {formatMessageTime(message.createTime)}
          </span>
        </div>
        <div className="mt-1 break-words text-sm">{getMessageContent(message)}</div>
      </div>
    </div>
  );
});

const ChatHistoryPanel = ({
  data,
  loading,
  closeOverlay,
}: {
  data: any[];
  loading: boolean;
  closeOverlay: () => void;
}) => {
  // 分组消息数据
  const [groupedData, setGroupedData] = useState<any[]>([]);
  // 当前选中的消息源
  const [selectedSource, setSelectedSource] = useState<any>(null);
  // 消息列表
  const [messageList, setMessageList] = useState<any[]>([]);

  // 处理数据分组
  useEffect(() => {
    if (!data || data.length === 0) {
      setGroupedData([]);
      setSelectedSource(null);
      setMessageList([]);
      return;
    }
  }, [data]);

  // 点击消息来源
  const handleSourceClick = (source: any) => {
    setSelectedSource(source.conversationID);
    setMessageList(source.messageList || []);
  };

  return (
    <Spin wrapperClassName="h-full" spinning={loading}>
      <div className="flex h-full">
        {/* 左侧消息来源列表 */}
        <div className="h-full w-1/2 overflow-hidden border-r border-gray-200">
          <Virtuoso
            className={clsx("h-full overflow-x-hidden", styles["virtuoso-wrapper"])}
            data={data}
            components={{
              EmptyPlaceholder: () =>
                loading ? null : (
                  <Empty className="mt-[30%]" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
            }}
            computeItemKey={(index, item) => item.sourceID || index.toString()}
            itemContent={(index, item) => (
              <ChatSourceRender
                item={item}
                id={`chat-source-${index}`}
                onClick={() => handleSourceClick(item)}
                isActive={selectedSource === item.conversationID}
              />
            )}
          />
        </div>

        {/* 右侧消息列表 */}
        <div className="h-full w-1/2 overflow-hidden">
          {selectedSource ? (
            <Virtuoso
              className={clsx("h-full overflow-x-hidden", styles["virtuoso-wrapper"])}
              data={messageList}
              components={{
                EmptyPlaceholder: () => (
                  <Empty
                    className="mt-[30%]"
                    description="无消息记录"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
              computeItemKey={(index, message) =>
                message.clientMsgID || index.toString()
              }
              itemContent={(index, message) => <MessageItemRender message={message} />}
            />
          ) : (
            <Empty
              className="mt-[30%]"
              description="请选择一个聊天"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </div>
    </Spin>
  );
};

export default ChatHistoryPanel;
