import { useLatest, useThrottleFn, useUpdateEffect } from "ahooks";
import { useEffect, useRef } from "react";

import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { IMSDK } from "@/layout/MainContentWrap";
import { useContactStore, useConversationStore, useUserStore } from "@/store";
import emitter from "@/utils/events";

export default function useConversationState() {
  const syncState = useUserStore((state) => state.syncState);
  const latestSyncState = useLatest(syncState);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const latestCurrentConversation = useLatest(currentConversation);
  const isBlackUser = useContactStore(
    (state) =>
      state.blackList.findIndex(
        (user) => user.userID === currentConversation?.userID,
      ) !== -1,
  );

  const { isJoinGroup, isNomal } = useCurrentMemberRole();
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

  useUpdateEffect(() => {
    if (syncState !== "loading") {
      checkConversationState();
    }
  }, [syncState]);

  useUpdateEffect(() => {
    throttleCheckConversationState();
  }, [currentConversation?.unreadCount]);

  useEffect(() => {
    checkConversationState();
  }, [currentConversation?.conversationID]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkConversationState();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // 监听新消息事件，立即检查已读状态
    function handleNewMessage() {
      if (document.visibilityState === "visible") {
        safeSetTimeout(checkConversationState, 100); // 使用安全的setTimeout，短延迟确保状态已更新
      }
    }
    
    emitter.on('PUSH_NEW_MSG', handleNewMessage);
    
    return () => {
      clearAllTimeouts(); // 清理所有未完成的计时器
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      emitter.off('PUSH_NEW_MSG', handleNewMessage);
    };
  }, []);

  const checkConversationState = () => {
    if (
      !latestCurrentConversation.current ||
      latestSyncState.current === "loading" ||
      document.visibilityState === "hidden"
    )
      return;

    if (latestCurrentConversation.current.unreadCount > 0) {
      IMSDK.markConversationMessageAsRead(
        latestCurrentConversation.current.conversationID,
      );
    }
  };

  const { run: throttleCheckConversationState } = useThrottleFn(
    checkConversationState,
    { wait: 2000, leading: false },
  );

  const getIsCanSendMessage = () => {
    if (currentConversation?.userID) {
      return !isBlackUser;
    }

    if (!isJoinGroup) {
      return false;
    }

    return true;
  };

  return {
    getIsCanSendMessage,
    isBlackUser,
    currentConversation,
  };
}
