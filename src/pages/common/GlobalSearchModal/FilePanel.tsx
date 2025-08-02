import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import {
  FriendUserItem,
  GroupItem,
  SearchMessageResultItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { Empty, List, Spin } from "antd";
import clsx from "clsx";
import { memo, useState, useEffect } from "react";
import { Virtuoso } from "react-virtuoso";

import OIMAvatar from "@/components/OIMAvatar";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { IMSDK } from "@/layout/MainContentWrap";
import { formatMessageTime } from "@/utils/imCommon";

import styles from "./index.module.scss";
import { downloadFile, bytesToSize } from "@/utils/common";
import file_icon from "@/assets/images/messageItem/file_icon.png";
import FileDownloadIcon from "@/svg/FileDownloadIcon";

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
export const FileItemRender = memo(({ message }: { message: any }) => {
  return (
    <div
      key={message.clientMsgID}
      className={clsx(
        "mx-3 my-2 flex items-center rounded-md  hover:bg-[var(--primary-active)]",
      )}
    >
      <div className="flex w-full items-center p-3">
        <div className="relative mr-3 flex h-10 w-10 items-center justify-center rounded-md ">
          <img width={36} src={file_icon} alt="file" />
          <div
            className="absolute left-0 top-0 flex h-full w-full cursor-pointer items-center justify-center rounded-md bg-[rgba(0,0,0,.4)]"
            onClick={() => downloadFile(message.fileElem?.sourceUrl ?? "")}
          >
            <FileDownloadIcon percent={0} />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="line-clamp-1 break-all font-medium">
            {message.fileElem.fileName}
          </div>
          <div className="text-xs text-[var(--sub-text)]">{message.sourceName}</div>
        </div>
        <div className="ml-2 text-xs text-[var(--sub-text)]">
          {formatMessageTime(message.sendTime)}
        </div>
      </div>
    </div>
  );
});

const FilePanel = ({
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

  return (
    <Spin wrapperClassName="h-full" spinning={loading}>
      <Virtuoso
        className={clsx("h-full overflow-x-hidden", styles["virtuoso-wrapper"])}
        data={data}
        components={{
          EmptyPlaceholder: () =>
            loading ? null : (
              <Empty className="mt-[30%]" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ),
        }}
        computeItemKey={(index, message) => message.clientMsgID || index.toString()}
        itemContent={(index, message) => {
          return <FileItemRender message={message} />;
        }}
      />
    </Spin>
  );
};

export default FilePanel;
