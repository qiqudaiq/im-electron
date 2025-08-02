import {
  MessageItem as MessageItemType,
  MessageType,
  SessionType,
} from "@openim/wasm-client-sdk";
import { useDocumentVisibility } from "ahooks";
import { Checkbox, Popover } from "antd";
import clsx from "clsx";
import  {
  FC,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import readed_icon from "@/assets/images/messageItem/readed_icon.png";
import unread_icon from "@/assets/images/messageItem/unread_icon.png";
import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useForwardStore } from "@/store";
import emitter from "@/utils/events";
import { formatMessageTime } from "@/utils/imCommon";

import AtTextMessageRender from "./AtTextMessageRender";
import CallMessageRender from "./CallMessageRender";
import CardMessageRenderer from "./CardMessageRenderer";
import CatchMessageRender from "./CatchMsgRenderer";
import FaceMessageRender from "./FaceMessageRender";
import FileMessageRenderer from "./FileMessageRenderer";
import GroupCardMessageRender from "./GroupCardMessageRender";
import GroupNoticeRender from "./GroupNoticeRender";
import LocationMessageRenderer from "./LocationMessageRenderer";
import MediaMessageRender from "./MediaMessageRender";
import MergeMessageRender from "./MergeMessageRender";
import styles from "./message-item.module.scss";
import MessageItemErrorBoundary from "./MessageItemErrorBoundary";
import MessageMenuContent from "./MessageMenuContent";
import MessageSuffix from "./MessageSuffix";
import QuoteMessageRender from "./QuoteMessageRender";
import RedPacketMessageRender from "./RedPacketMessageRender";
import RefundNotificationRenderer from "./RefundNotificationRenderer";
import TextMessageRender from "./TextMessageRender";
import TransferMessageRender from "./TransferMessageRender";
import VoiceMessageRender from "./VoiceMessageRender";
import { CustomType } from "@/constants";
import { el } from "date-fns/locale";
import BannerNotificationRenderer from "./BannerNotificationRenderer";

export interface IMessageItemProps {
  message: MessageItemType;
  isSender: boolean;
  disabled?: boolean;
  conversationID?: string;
  messageUpdateFlag?: string;
}
const unreadList: string[] = [];
let sendList: string[] = [];
const maxUpdateCount = 5;
let unreadCount = 0;
let flag = 0;

const components: Record<number, FC<IMessageItemProps>> = {  
  [MessageType.TextMessage]: TextMessageRender,
  [MessageType.AtTextMessage]: AtTextMessageRender,
  [MessageType.VoiceMessage]: VoiceMessageRender,
  [MessageType.PictureMessage]: MediaMessageRender,
  [MessageType.VideoMessage]: MediaMessageRender,
  [MessageType.FaceMessage]: FaceMessageRender,
  [MessageType.CardMessage]: CardMessageRenderer,
  [MessageType.FileMessage]: FileMessageRenderer,
  [MessageType.LocationMessage]: LocationMessageRenderer,
  [MessageType.QuoteMessage]: QuoteMessageRender,
  [MessageType.GroupAnnouncementUpdated]: GroupNoticeRender,
  [MessageType.MergeMessage]: MergeMessageRender,
  [MessageType.CustomMessage]: (props) => {
    // 🔥 性能优化：缓存JSON解析结果，避免重复解析
    let customData: any;
    try {
      customData = JSON.parse(props.message.customElem!.data);
    } catch (error) {
      console.error("解析自定义消息失败:", error);
      return <CatchMessageRender />;
    }
    
    if (customData.customType === 10086) {
      return <TransferMessageRender {...props} />;
    } else if (customData.customType === 1001) {
      return <RedPacketMessageRender {...props} />;
    } else if (customData.customType === 401) {
      return <GroupCardMessageRender {...props} />;
    } else if (customData.customType === 500) {
      return <RefundNotificationRenderer {...props} />;
    } else if (customData.customType === CustomType.CallRecord) {
      return <CallMessageRender {...props} />;
    } else if (customData.customType === 2005) {
      return null; // 不显示 2005 类型的消息
    }
    return <CatchMessageRender />;
  },
  [MessageType.OANotification]: (props) => {
    // 🔥 性能优化：缓存JSON解析结果，避免重复解析
    let notificationData: any;
    try {
      if(props.message?.notificationElem!.detail){
        notificationData = JSON.parse(props.message.notificationElem!.detail);
      }
    } catch (error) {
      return <CatchMessageRender />;
    }
    
    if (notificationData?.notificationType === 500) { // 500 是退款通知
      return <RefundNotificationRenderer {...props} />;
    } else if (notificationData?.notificationType === 600) { // 600 是图文通知
      return <BannerNotificationRenderer {...props} />
    }
    return <CatchMessageRender />;
  }
};

const MessageItem: FC<IMessageItemProps> = ({
  message,
  disabled,
  isSender,
  conversationID,
}) => {

  
  const messageWrapRef = useRef<HTMLDivElement>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const MessageRenderComponent = components[message.contentType] || CatchMessageRender;
  // 添加高亮状态
  const [isHighlighted, setIsHighlighted] = useState(false);
  const documentVisibility = useDocumentVisibility();
  const { selectionMode, selectedMessages, toggleMessage } = useForwardStore();
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );

  useEffect(() => {
    flag = 0;
    if (unreadCount === 0 && flag === 0) {
      unreadCount = currentConversation?.unreadCount ?? 0;
      flag = 1;
    }
  }, [currentConversation?.latestMsg])


  useEffect(() => {
    handleUnread()
  }, [documentVisibility]);

  // 添加新的检查机制：消息渲染时主动检查
  useEffect(() => {
    if (!message.isRead && documentVisibility === "visible") {
      handleUnread();
    }
  }, [message.clientMsgID]);

  const handleUnread = async () => {
    
    if (
      (currentConversation?.unreadCount || 0) > 0 &&
      documentVisibility === "visible" &&
      !message.isRead &&
      !unreadList.includes(message.clientMsgID)
    ) {
      // 先添加到列表
      unreadList.push(message.clientMsgID);
      sendList.push(message.clientMsgID);

      // 修复逻辑：在添加消息后检查是否应该发送已读回执
      const shouldSendReceipt = 
        sendList.length >= maxUpdateCount || // 达到最大批处理数量
        sendList.length >= (currentConversation?.unreadCount || 0); // 处理完所有未读消息

      if (shouldSendReceipt) {
        try {
          await IMSDK.markMessagesAsReadByMsgID({
            conversationID: currentConversation?.conversationID,
            clientMsgIDList: sendList,
          });
          sendList = [];
        } catch (error) {
          console.error('发送已读回执失败:', error);
        }
      }
    }
  }

  const closeMessageMenu = useCallback(() => {
    setShowMessageMenu(false);
  }, []);

  const canShowMessageMenu = !disabled;

  // 添加高亮效果监听
  useEffect(() => {
    const handleHighlight = (targetMessageID: string) => {
      if (targetMessageID === message.clientMsgID) {
        // 设置高亮
        setIsHighlighted(true);

        // 1秒后取消高亮
        setTimeout(() => {
          setIsHighlighted(false);
        }, 2000);
      }
    };

    emitter.on("HIGHLIGHT_MESSAGE", handleHighlight);

    return () => {
      emitter.off("HIGHLIGHT_MESSAGE", handleHighlight);
    };
  }, [message.clientMsgID]);

  // 判断是否是红包或转账消息
  const isRedPacketOrTransfer = () => {
    if (message.contentType === MessageType.CustomMessage) {
      try {
        const customData = JSON.parse(message.customElem!.data);
        return customData.customType === 10086 || customData.customType === 1001;
      } catch (error) {
        return false;
      }
    }
    return false;
  };

  // 检查消息是否可选中（红包和转账消息不可选中）
  const canBeSelected = !isRedPacketOrTransfer();

  // 检查消息是否被选中
  const isSelected = selectedMessages.some(
    (m) => m.clientMsgID === message.clientMsgID,
  );

  // 处理复选框变化
  const handleCheckboxChange = () => {
    if (canBeSelected) {
      toggleMessage(message);
    }
  };

  return (
    <>
      <div
        id={`chat_${message.clientMsgID}`}
        className={clsx("relative flex select-text px-5 py-3")}
        data-message-id={message.clientMsgID}
        onClick={() => {
          if (selectionMode && canBeSelected) {
            toggleMessage(message);
          }
        }}
        style={{
          backgroundColor: isSelected
            ? "#f3f4f6"
            : isHighlighted
              ? "#d4e9ff" // 高亮时的颜色
              : "transparent",
        }}
      >
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onChange={handleCheckboxChange}
            disabled={!canBeSelected}
          />
        )}
        <div
          className={clsx(
            styles["message-container"],
            isSender && styles["message-container-sender"],
          )}
        >
          <OIMAvatar
            size={36}
            src={message.senderFaceUrl}
            text={message.senderNickname}
            onClick={() => window.userClick(message.sendID, message.groupID)}
          />

          <div className={styles["message-wrap"]} ref={messageWrapRef}>
            <div className={styles["message-profile"]}>
              <div
                title={message.senderNickname}
                className={clsx(
                  "max-w-[30%] truncate text-[var(--sub-text)]",
                  isSender ? "ml-2" : "mr-2",
                )}
              >
                {message.senderNickname}
              </div>
              <div className="text-[var(--sub-text)]">
                {formatMessageTime(message.sendTime)}
              </div>
            </div>

            <Popover
              className={styles["menu-wrap"]}
              content={
                <MessageMenuContent
                  message={message}
                  conversationID={conversationID!}
                  closeMenu={closeMessageMenu}
                />
              }
              title={null}
              trigger="contextMenu"
              open={canShowMessageMenu ? showMessageMenu : false}
              onOpenChange={(vis) => setShowMessageMenu(vis)}
            >
              <MessageItemErrorBoundary message={message}>
                <MessageRenderComponent
                  message={message}
                  isSender={isSender}
                  disabled={disabled}
                />
                {isSender &&
                  currentConversation?.conversationType !== SessionType.Group && (
                    <img
                      style={{ position: "absolute", width: 20, left: -10, bottom: 0 }}
                      src={message.isRead ? readed_icon : unread_icon}
                    />
                  )}
              </MessageItemErrorBoundary>
              <MessageSuffix
                message={message}
                isSender={isSender}
                disabled={false}
                conversationID={conversationID}
              />
            </Popover>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(MessageItem);
