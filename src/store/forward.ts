import { MessageItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { t } from "i18next";
import { create } from "zustand";

import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import { ForwardStore } from "./type";
import { useConversationStore } from "./conversation";
import { SessionType } from "@openim/wasm-client-sdk";
import { useUserStore } from "./user";

const MAX_SELECTED_MESSAGES = 100; // 最大选择消息数量限制

// 限制数组大小的辅助函数
const limitArraySize = <T>(array: T[], maxSize: number): T[] => {
  if (array.length > maxSize) {
    // 保留最新选择的消息
    return array.slice(-maxSize);
  }
  return array;
};

export const useForwardStore = create<ForwardStore>()((set, get) => ({
  // 状态
  selectionMode: false,
  selectedMessages: [],

  // 方法
  startSelectionMode: () => {
    set({ selectionMode: true, selectedMessages: [] });
  },

  cancelSelectionMode: () => {
    set({ selectionMode: false, selectedMessages: [] });
  },

  toggleMessage: (message: MessageItem) => {
    set((state) => {
      const isSelected = state.selectedMessages.some(
        (m) => m.clientMsgID === message.clientMsgID,
      );

      if (isSelected) {
        return {
          selectedMessages: state.selectedMessages.filter(
            (m) => m.clientMsgID !== message.clientMsgID,
          ),
        };
      } else {
        // 检查是否超过最大选择数量
        if (state.selectedMessages.length >= MAX_SELECTED_MESSAGES) {
          feedbackToast({ 
            msg: t("最多只能选择{{max}}条消息", { max: MAX_SELECTED_MESSAGES }) 
          });
          return state;
        }
        
        return {
          selectedMessages: limitArraySize(
            [...state.selectedMessages, message], 
            MAX_SELECTED_MESSAGES
          ),
        };
      }
    });
  },

  selectMessages: (messages: MessageItem[]) => {
    const limitedMessages = limitArraySize(messages, MAX_SELECTED_MESSAGES);
    if (messages.length > MAX_SELECTED_MESSAGES) {
      feedbackToast({ 
        msg: t("选择的消息数量超过限制，已自动截取最新的{{max}}条", { max: MAX_SELECTED_MESSAGES }) 
      });
    }
    set({ selectedMessages: limitedMessages });
  },

  clearSelectedMessages: () => {
    set({ selectedMessages: [] });
  },

  batchForwardMessages: async ({
    isGroup,
    peerNickname,
    selfNickname,
  }: {
    isGroup: boolean;
    peerNickname?: string;
    selfNickname?: string;
  }) => {
    const { selectedMessages, cancelSelectionMode } = get();
    if (selectedMessages.length === 0) {
      feedbackToast({ msg: t("请选择至少一条消息进行转发") });
      return;
    }
    try {
      const summaryList = selectedMessages.map((msg) => {
        return msg.senderNickname + " " + msg.textElem?.content;
      });
      // 获取当前会话和自己的信息
      const currentConversation = useConversationStore.getState().currentConversation;
      const selfInfo = useUserStore.getState().selfInfo;


      let title = "";
      if (isGroup) {
        title = "群组的聊天记录";
      } else {
        const peerNickname = currentConversation?.showName || "对方";
        const selfNickname = selfInfo.nickname || "我";
        title = `${selfNickname} 和 ${peerNickname}的聊天记录`;
      }

      const res = await IMSDK.createMergerMessage({
        messageList: selectedMessages,
        title: title,
        summaryList: [],
      });


      // 打开选择联系人对话框转发消息
      emit("OPEN_CHOOSE_MODAL", {
        type: "FORWARD_MESSAGE",
        extraData: res.data,
      });

      // 转发完成后关闭选择模式
      cancelSelectionMode();
    } catch (error) {
      console.error("创建合并消息失败:", error);
      feedbackToast({ error, msg: t("创建合并消息失败") });
    }
  },
}));
