import React from "react";
import { Typography } from "antd";
import OIMAvatar from "@/components/OIMAvatar";
import dayjs from "dayjs";
import { formatMessageTime } from "@/utils/imCommon";

interface ChatHistoryItemProps {
  avatar: string;
  nickname: string;
  content: string;
  sendTime: number;
  onClick?: () => void;
}

const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({
  avatar,
  nickname,
  content,
  sendTime,
  onClick,
}) => {
  return (
    <div
      className="flex cursor-pointer items-start rounded-md p-2 transition-colors duration-200 hover:bg-[#0081cc1a]"
      onDoubleClick={onClick}
    >
      <div className="mr-3">
        <OIMAvatar src={""} text={nickname} size={40} />
      </div>
      <div className="min-w-0 flex-1">
        <div>
          <div className="text-xs text-[var(--sub-text)]">
            {nickname}
            <span className="ml-2 text-xs text-[var(--sub-text)]">
              {formatMessageTime(sendTime)}
            </span>
          </div>
        </div>
        <Typography.Paragraph
          ellipsis={{ rows: 2 }}
          className="m-0 text-[13px] text-gray-700"
        >
          {content}
        </Typography.Paragraph>
      </div>
    </div>
  );
};

export default ChatHistoryItem;
