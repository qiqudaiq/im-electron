import { MessageItem as IMessageItem, SessionType, MessageType } from "@openim/wasm-client-sdk";
import { useGetState } from "ahooks";
import { Layout, Space, Spin } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import React, { memo, useEffect, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import upIcon from "@/assets/images/chatFooter/pull_up_icon.png";
import { SystemMessageTypes } from "@/constants/im";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { OverlayVisibleHandle } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import RefundNotificationRenderer from "@/pages/chat/queryChat/MessageItem/RefundNotificationRenderer";
import { useConversationStore, useUserStore } from "@/store";
import emitter, { emit } from "@/utils/events";

import GroupNoticeModal from "./GroupNoticeModal";
import MessageItem from "./MessageItem";
import NotificationMessage from "./NotificationMessage";
import SystemNotification from "./SystemNotification";
import { useHistoryMessageList } from "./useHistoryMessageList";
// import { throttle } from "xgplayer/es/utils/util";
interface IChatContent {
  isNotificationSession: boolean;
}
interface IUnreadStatus {
  unReadCount: number;
  preMsg: IMessageItem;
}
const ChatContent: React.FC<IChatContent> = (props) => {
  const { isNotificationSession } = props;
  const virtuoso = useRef<VirtuosoHandle>(null);
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const groupNoticeModalRef = useRef<OverlayVisibleHandle>(null);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const [unReadStatus, setUnReadStatus] = useState<IUnreadStatus>({
    unReadCount: 0,
    preMsg: null,
  });
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  // 添加搜索跳转状态
  const [searchJumpTarget, setSearchJumpTarget] = useState<{
    messageID: string;
    isSearching: boolean;
  }>({ messageID: "", isSearching: false });
  const isGroup = currentConversation?.conversationType === SessionType.Group;

  useEffect(() => {
    if (!currentConversation) {
      return;
    }
    if (isGroup) {
      IMSDK.markConversationMessageAsRead(currentConversation?.conversationID);
      IMSDK.setConversation({
        conversationID: currentConversation?.conversationID,
        groupAtType: 0,
      })
      return;
    }
    getHistory();
    return () => {
      resetUnread();
    };
  }, [currentConversation?.conversationID]);

  const getHistory = async () => {
    const unReadCount = currentConversation?.unreadCount;
    if (unReadCount === 0) return;
    const lastMsg = JSON.parse(currentConversation?.latestMsg || "");
    const { data } = await IMSDK.getAdvancedHistoryMessageList({
      count: unReadCount + 1,
      startClientMsgID: lastMsg.clientMsgID,
      conversationID: currentConversation?.conversationID,
      viewType: 1,
    });
    const preMsg = data.messageList[0];
    setUnReadStatus({
      unReadCount,
      preMsg,
    });
  };

  // historyModalRef.current?.openOverlay();

  const openGroupNoticeModal = () => {
    if (groupNoticeModalRef.current?.isOverlayOpen) return;
    groupNoticeModalRef.current?.openOverlay();
  };

  useEffect(() => {
    if (isGroup) {
      openGroupNoticeModal();
    } else {
      groupNoticeModalRef.current?.closeOverlay();
    }
  }, [isGroup]);

  const scrollToBottom = () => {
    setTimeout(() => {
      virtuoso.current?.scrollToIndex({
        index: 9999,
        align: "end",
        behavior: "auto",
      });
    });
  };

  const {
    SPLIT_COUNT,
    conversationID,
    loadState,
    moreOldLoading,
    getMoreOldMessages,
    moreNewLoading,
    getMoreNewMessages,
  } = useHistoryMessageList();

  // 图片预加载
  useImagePreloader(loadState.messageList, {
    enabled: !loadState.initLoading,
    maxPreload: 15,
    delay: 200
  });

  // 添加处理搜索消息的函数
  const searchForMessage = async () => {
    if (!searchJumpTarget.isSearching) return;

    // 先检查当前消息列表中是否有目标消息
    const targetIndex = loadState.messageList.findIndex(
      (msg) => msg.clientMsgID === searchJumpTarget.messageID,
    );

    if (targetIndex !== -1) {
      // 找到消息，滚动到该位置
      setTimeout(() => {
        virtuoso.current?.scrollToIndex({
          index: targetIndex,
          align: "center",
          behavior: "smooth",
        });
      }, 100);

      // 发送高亮事件
      setTimeout(() => {
        emit("HIGHLIGHT_MESSAGE", searchJumpTarget.messageID);
      }, 1000);
      setSearchJumpTarget({ messageID: "", isSearching: false });
      return;
    }

    if (loadState.hasMoreOld && !moreOldLoading) {
      await getMoreOldMessages();
    } else {
      setSearchJumpTarget({ messageID: "", isSearching: false });
    }
  };

  // 监听搜索跳转状态变化
  useEffect(() => {
    if (searchJumpTarget.isSearching) {
      searchForMessage();
    }
  }, [searchJumpTarget, loadState.messageList]);

  useEffect(() => {
    const scrollToMessage = (targetMessageID: string) => {

      const targetIndex = loadState.messageList.findIndex(
        (msg) => msg.clientMsgID === targetMessageID,
      );

      if (targetIndex !== -1) {
        virtuoso.current?.scrollToIndex({
          index: targetIndex,
          align: "center",
          behavior: "smooth",
        });

        emit("HIGHLIGHT_MESSAGE", targetMessageID);
      }
    };

    // 添加搜索跳转事件监听
    const setSearchTarget = (target: { messageID: string; isSearching: boolean }) => {
      setSearchJumpTarget(target);
    };

    emitter.on("SCROLL_TO_MESSAGE", scrollToMessage);
    emitter.on("CHAT_LIST_SCROLL_TO_BOTTOM", scrollToBottom);
    emitter.on("SET_SEARCH_JUMP_TARGET", setSearchTarget);

    return () => {
      emitter.off("CHAT_LIST_SCROLL_TO_BOTTOM", scrollToBottom);
      emitter.off("SCROLL_TO_MESSAGE", scrollToMessage);
      emitter.off("SET_SEARCH_JUMP_TARGET", setSearchTarget);
    };
  }, [isNotificationSession]);

  const loadMoreMessage = () => {
    if (!loadState.hasMoreOld || moreOldLoading) return;
    getMoreOldMessages(true, 1);
  };

  const loadNewMessage = () => {
    if (!loadState.hasMoreNew) return;

    getMoreNewMessages();
  };
  // const checkScroll = throttle((scrollContainer) => {
  //   const scrollThreshold = 200
  //   const { scrollHeight, scrollTop, clientHeight } = scrollContainer
  //   const distanceToBottom = scrollHeight - scrollTop - clientHeight
  //   console.log("test_con distanceToBottom", distanceToBottom);
  //   // console.log("test_con scrollToBottom", scrollHeight);
  //   // console.log("test_con scrollToBottom", scrollHeight);
  //   if (distanceToBottom < scrollThreshold && !moreNewLoading) {
  //     // setLoading(true)
  //     // fetchMoreData().then(newData => {
  //     //   setData(prev => [...prev, ...newData])
  //     //   setLoading(false)
  //     // })
  //   }
  // }, 500)
  const resetUnread = () => {
    setUnReadStatus({
      unReadCount: 0,
      preMsg: null,
    });
    IMSDK.markConversationMessageAsRead(currentConversation?.conversationID);
  };
  const locateToTargetLine = () => {
    if (unReadStatus.unReadCount === 0) return;
    emit("LOCATE_TO_TARGET_LINE", {

      message: unReadStatus.preMsg,
    });
    resetUnread();
  };
  return (
    <Layout.Content
      className="relative flex h-full overflow-hidden !bg-white"
      id="chat-main"
    >
      {unReadStatus.unReadCount > 0 &&
        currentConversation &&
        currentConversation.unreadCount > 0 && (
          <div
            style={{
              right: 20,
              bottom: 20,
              position: "absolute",
              padding: "5px 20px",
              zIndex: 1,
              cursor: "pointer",
              borderRadius: 15,
              color: "green",
              background: "#fff",
              boxShadow: "0px 0px 5px 5px  rgba(0, 0, 0, 0.1)",
            }}
            onClick={locateToTargetLine}
          >
            <Space>
              <img src={upIcon} style={{ width: 20 }} />
              <span style={{ color: "green" }}>
                {" "}
                {/*{unReadStatus.unReadCount - getViewedCount().length + 1}{" "}*/}
                {currentConversation?.unreadCount}
                {t("placeholder.UnreadMessages")}
              </span>
            </Space>
          </div>
        )}
        
      {loadState.initLoading ? (
        <div className="flex h-full w-full items-center justify-center bg-white pt-1">
          <Spin spinning />
        </div>
      ) : (
        <Virtuoso
          id="chat-list"
          className="w-full overflow-x-hidden"
          followOutput={(isAtBottom) => {
            if (document.hidden || !isAtBottom) {
              return false;
            }
            return "smooth";
          }}
          // followOutput="smooth"

          firstItemIndex={loadState.firstItemIndex}
          initialTopMostItemIndex={SPLIT_COUNT - 1}
          // atTopStateChange={(atTop) => {
          //   if (atTop) {
          //     console.log('atTopStateChange',atTop);
          //     loadMoreMessage()
          //     // getMoreOldMessages();
          //   }
          // }}
          // onScroll={(e) => checkScroll(e.currentTarget)}
          startReached={loadMoreMessage}
          endReached={loadNewMessage}
          //endReached={getMoreNewMessages}
          ref={virtuoso}
          data={loadState.messageList}
          // components={{
          //   Header: () =>
          //     loadState.hasMoreOld ? (
          //       <div
          //         className={clsx(
          //           "flex justify-center py-2 opacity-0",
          //           moreOldLoading && "opacity-100",
          //         )}
          //       >
          //         <Spin />
          //       </div>
          //     ) : null,
          // }}
          components={{
            Header: () =>
              loadState.hasMoreOld ? (
                <div
                  className={clsx(
                    "flex justify-center py-2 opacity-0",
                    moreOldLoading && "opacity-100",
                  )}
                >
                  <Spin />
                </div>
              ) : null,
            Footer: () =>
              loadState.hasMoreNew ? (
                <div
                  className={clsx(
                    "flex justify-center py-2 opacity-0",
                    moreNewLoading && "opacity-100",
                  )}
                >
                  <Spin />
                </div>
              ) : null,
          }}
          computeItemKey={(_, item) => item.clientMsgID}
          itemContent={(_, message) => {
            // 下面的代码保持不变
            if (
              message.sessionType === SessionType.Notification &&
              message.contentType !== MessageType.OANotification
            ) {
              return <SystemNotification key={message.clientMsgID} message={message} />;
            }

            if (SystemMessageTypes.includes(message.contentType)) {
              return (
                <NotificationMessage key={message.clientMsgID} message={message} />
              );
            }

            if (message.customElem && message.customElem.data) {
              if (JSON.parse(message.customElem.data).customType === 1002) {
                const data = JSON.parse(message.customElem.data);

                return (
                  <div
                    style={{ display: "flex", justifyContent: "center", color: "#ccc" }}
                  >
                    {data.content}
                  </div>
                );
              }
            }

            const isSender = selfUserID === message.sendID;
            return (
              <MessageItem
                key={message.clientMsgID}
                conversationID={conversationID}
                message={message}
                messageUpdateFlag={message.senderNickname + message.senderFaceUrl}
                isSender={isSender}
              />
            );
          }}
        />
      )}
      {isGroup && <GroupNoticeModal ref={groupNoticeModalRef} />}
    </Layout.Content>
  );
};

export default memo(ChatContent);
