import { MessageItem } from "@openim/wasm-client-sdk";
import { useLatest, useRequest } from "ahooks";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { IMSDK } from "@/layout/MainContentWrap";
import emitter, { emit, UpdateMessaggeBaseInfoParams } from "@/utils/events";

const START_INDEX = 10000;
const SPLIT_COUNT = 20;
const MAX_MESSAGES = 1000; // 最大消息数量限制，防止内存泄漏

export function useHistoryMessageList() {
  const { conversationID } = useParams();
  const [loadState, setLoadState] = useState({
    initLoading: true,
    hasMoreOld: true,
    hasMoreNew: false,
    messageList: [] as MessageItem[],
    firstItemIndex: START_INDEX,
    transferList: [] as any,
  });
  const latestLoadState = useLatest(loadState);
  const minSeq = useRef(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]); // 用于跟踪所有setTimeout

  // 清理所有计时器的函数
  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  };

  // 安全的setTimeout包装器
  const safeSetTimeout = (callback: () => void, delay?: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // 执行后从引用数组中移除
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  };

  // 限制消息列表大小的函数
  const limitMessageList = (messageList: MessageItem[]) => {
    if (messageList.length > MAX_MESSAGES) {
      // 保留最新的消息，删除旧消息
      return messageList.slice(-MAX_MESSAGES);
    }
    return messageList;
  };

  useEffect(() => {
    loadHistoryMessages();
    return () => {
      clearAllTimeouts(); // 清理所有计时器
      setLoadState(() => ({
        initLoading: true,
        hasMoreOld: true,
        hasMoreNew: false,
        messageList: [] as MessageItem[],
        firstItemIndex: START_INDEX,
        transferList: [] as any,
      }));
      minSeq.current = 0;
    };
  }, [conversationID]);

  useEffect(() => {
    const pushNewMessage = (message: MessageItem) => {
      if (
        latestLoadState.current.messageList.find(
          (item) => item.clientMsgID === message.clientMsgID,
        )
      ) {
        return;
      }
      setLoadState((preState) => {
        const newMessageList = limitMessageList([...preState.messageList, message]);
        return {
          ...preState,
          messageList: newMessageList,
        };
      });
    };
    const updateOneMessage = (message: MessageItem) => {
      setLoadState((preState) => {
        const tmpList = [...preState.messageList];
        const idx = tmpList.findIndex((msg) => msg.clientMsgID === message.clientMsgID);
        if (idx < 0) {
          return preState;
        }

        tmpList[idx] = { ...tmpList[idx], ...message };
        return {
          ...preState,
          messageList: limitMessageList(tmpList),
        };
      });
    };

    const updateTransferMessage = (id: string) => {

      setLoadState((preState) => {
        const tmpList = [...preState.messageList];
        const idx = tmpList.findIndex(
          (msg) => JSON.parse(msg.customElem!.data).data.msg_id === id,
        );
        if (idx < 0) {
          return preState;
        }

        const data = JSON.parse(tmpList[idx].customElem!.data ?? {});
        data.data.status = "completed";
        tmpList[idx].customElem!.data = JSON.stringify(data);

        // tmpList[idx] = { ...tmpList[idx], ...data };
        return {
          ...preState,
          messageList: limitMessageList(tmpList),
        };
      });
    };

    const updateMessageNicknameAndFaceUrl = ({
      sendID,
      senderNickname,
      senderFaceUrl,
    }: UpdateMessaggeBaseInfoParams) => {
      setLoadState((preState) => {
        const tmpList = [...preState.messageList];
        tmpList.forEach((message) => {
          if (message.sendID === sendID) {
            message.senderNickname = senderNickname;
            message.senderFaceUrl = senderFaceUrl;
          }
        });
        return {
          ...preState,
          messageList: limitMessageList(tmpList),
        };
      });
    };

    const deleteOnewMessage = (clientMsgID: string) => {
      setLoadState((preState) => {
        const messageList = preState.messageList.filter(
          (message) => message.clientMsgID !== clientMsgID,
        );
        return {
          ...preState,
          messageList,
        };
      });
    };

    const clearMessages = () => {
      setLoadState((preState) => ({
        ...preState,
        messageList: [],
      }));
    };

    const replaceMessageList = (messageList: MessageItem[]) => {
      setLoadState((preState) => ({
        ...preState,
        messageList: limitMessageList(messageList),
        firstItemIndex: START_INDEX - messageList.length,
        hasMoreOld: true,
        hasMoreNew: false,
      }));
    };

    const locateToTargetLine = async (message: MessageItem) => {

      try {
        const { data } = await IMSDK.getAdvancedHistoryMessageList({
          count: SPLIT_COUNT,
          startClientMsgID: message.clientMsgID,
          conversationID: conversationID ?? "",
          viewType: 2, // 以特定消息为中心获取
        });


        const newList = data.messageList || [];

        // 检查是否有更新的消息
        const hasNewerMessages = await checkNewerMessages(message.clientMsgID);

        safeSetTimeout(() =>
          setLoadState((preState) => ({
            ...preState,
            initLoading: false,
            hasMoreOld: hasNewerMessages,
            hasMoreNew: !data.isEnd, // 根据检查结果设置
            messageList: limitMessageList(newList),
            firstItemIndex: START_INDEX - (newList?.length || 0),
          })),
        );
        minSeq.current = data["messageList"][data?.messageList?.length - 1]?.clientMsgID;

        // 添加20px的滚动偏移
        safeSetTimeout(() => {
          const chatList = document.getElementById("chat-list");
          if (chatList) {
            chatList.scrollTop = 2; // 设置一个固定的滚动位置，让内容离顶部20px
          }
        }, 100);

        safeSetTimeout(() => {
          emit("HIGHLIGHT_MESSAGE", message.clientMsgID);
        }, 500);

      } catch (error) {
        console.error("定位到目标消息失败:", error);
      }
    };

    // 检查是否有更新的消息
    const checkNewerMessages = async (clientMsgID: string) => {

      try {
        const { data } = await IMSDK.getAdvancedHistoryMessageList({
          count: 2,
          startClientMsgID: clientMsgID,
          conversationID: conversationID ?? "",
          viewType: 1, // 向后拉取
        });


        return !data.isEnd;
      } catch (e) {
        console.error("检查新消息失败", e);
        return false;
      }
    };

    emitter.on("REPLACE_MSG_LIST", replaceMessageList);
    emitter.on("LOCATE_TO_TARGET_LINE", locateToTargetLine);
    emitter.on("PUSH_NEW_MSG", pushNewMessage);
    emitter.on("UPDATE_ONE_MSG", updateOneMessage);
    emitter.on("UPDATE_TRANSFER_MSG", updateTransferMessage);
    emitter.on("UPDATE_MSG_NICK_AND_FACEURL", updateMessageNicknameAndFaceUrl);
    emitter.on("DELETE_ONE_MSG", deleteOnewMessage);
    emitter.on("CLEAR_MSGS", clearMessages);
    return () => {
      emitter.off("PUSH_NEW_MSG", pushNewMessage);
      emitter.off("UPDATE_ONE_MSG", updateOneMessage);
      emitter.off("UPDATE_TRANSFER_MSG", updateTransferMessage);
      emitter.off("UPDATE_MSG_NICK_AND_FACEURL", updateMessageNicknameAndFaceUrl);
      emitter.off("DELETE_ONE_MSG", deleteOnewMessage);
      emitter.off("CLEAR_MSGS", clearMessages);
      emitter.off("REPLACE_MSG_LIST", replaceMessageList);
      emitter.off("LOCATE_TO_TARGET_LINE", locateToTargetLine);
    };
  }, []);

  const loadHistoryMessages = () => getMoreOldMessages(false);

  const { loading: moreOldLoading, runAsync: getMoreOldMessages } = useRequest(
    async (loadMore = true, viewType = 0) => {
      const requestTime = new Date().toISOString();
      console.log(`📨 [${requestTime}] 开始请求历史消息 - 会话ID: ${conversationID}, 加载模式: ${loadMore ? '追加' : '初始'}, 视图类型: ${viewType}`);
      
      const reqConversationID = conversationID;
      const startTime = performance.now();
      
      const { data } = await IMSDK.getAdvancedHistoryMessageList({
        count: SPLIT_COUNT,
        startClientMsgID: loadMore
          ? latestLoadState.current.messageList[0]?.clientMsgID
          : "",
        conversationID: conversationID ?? "",
        viewType: viewType,
      });

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      
      if (conversationID !== reqConversationID) {
        console.log(`⚠️ [${requestTime}] 会话ID已变更，取消处理`);
        return;
      }
      
      console.log(`📊 [${requestTime}] 历史消息请求完成 - 耗时: ${duration}ms, 获取消息数: ${data.messageList?.length || 0}, 是否结束: ${data.isEnd}`);
      
      safeSetTimeout(() =>
        setLoadState((preState) => {
          const newMessageList = [...data.messageList, ...(loadMore ? preState.messageList : [])];
          return {
            ...preState,
            initLoading: false,
            hasMoreOld: !data.isEnd,
            messageList: limitMessageList(newMessageList),
            firstItemIndex: preState.firstItemIndex - data.messageList.length,
          };
        }),
      );
      minSeq.current = data.lastMinSeq;
    },
    {
      manual: true,
    },
  );

  const { loading: moreNewLoading, runAsync: getMoreNewMessages } = useRequest(
    async () => {
      const reqConversationID = conversationID;
      if (!latestLoadState.current.messageList.length) return;

      const lastMessage =
        latestLoadState.current.messageList[
          latestLoadState.current.messageList.length - 1
        ];

      const { data } = await IMSDK.getAdvancedHistoryMessageListReverse({
        count: SPLIT_COUNT,
        startClientMsgID: lastMessage.clientMsgID,
        conversationID: conversationID ?? "",
        lastMinSeq: 0, // 向后拉取
      });

      if (conversationID !== reqConversationID) return;

      safeSetTimeout(() =>
        setLoadState((preState) => {
          const newMessageList = [...preState.messageList, ...data.messageList];
          return {
            ...preState,
            hasMoreNew: !data.isEnd,
            messageList: limitMessageList(newMessageList),
          };
        }),
      );
    },
    {
      manual: true,
    },
  );

  return {
    SPLIT_COUNT,
    loadState,
    latestLoadState,
    conversationID,
    moreOldLoading,
    moreNewLoading,
    getMoreOldMessages,
    getMoreNewMessages,
  };
}

export const pushNewMessage = (message: MessageItem) => emit("PUSH_NEW_MSG", message);
export const updateOneMessage = (message: MessageItem) =>
  emit("UPDATE_ONE_MSG", message);

export const updateTransferMessage = (id: string) => emit("UPDATE_TRANSFER_MSG", id);

export const updateMessageNicknameAndFaceUrl = (params: UpdateMessaggeBaseInfoParams) =>
  emit("UPDATE_MSG_NICK_AND_FACEURL", params);
export const deleteOneMessage = (clientMsgID: string) =>
  emit("DELETE_ONE_MSG", clientMsgID);
export const clearMessages = () => emit("CLEAR_MSGS");
