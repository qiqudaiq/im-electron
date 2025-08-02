import {
  ConversationItem,
  GroupItem,
  GroupMemberItem,
  MessageItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { t } from "i18next";
import { create } from "zustand";

import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import { getIMToken } from "@/utils/storage";
import { conversationSort, isGroupSession } from "@/utils/imCommon";

import { ConversationListUpdateType, ConversationStore } from "./type";
import { useUserStore } from "./user";

const CONVERSATION_SPLIT_COUNT = 100;
const MAX_CONVERSATION_LIST_SIZE = 2000; // 最大会话列表大小

// 限制数组大小的辅助函数
const limitArraySize = <T>(array: T[], maxSize: number): T[] => {
  if (array.length > maxSize) {
    // 保留最新的数据，删除旧数据
    return array.slice(-maxSize);
  }
  return array;
};

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  conversationIniting: true,
  conversationList: [],
  currentConversation: undefined,
  unReadCount: 0,
  currentGroupInfo: undefined,
  currentMemberInGroup: undefined,
  quoteMessage: undefined,
  getConversationListByReq: async (isOffset?: boolean, forceLoading?: boolean) => {
    const IMToken = await getIMToken();
    if (!IMToken) {
      return false;
    }
    if (!forceLoading && !isOffset) set(() => ({ conversationIniting: true }));

    let tmpConversationList = [] as ConversationItem[];
    try {
      const { data } = await IMSDK.getConversationListSplit({
        offset: isOffset ? get().conversationList.length : 0,
        count: CONVERSATION_SPLIT_COUNT,
      });
      tmpConversationList = data;
    } catch (error) {
      // feedbackToast({ error, msg: t("toast.getConversationFailed") });
      if (!isOffset) set(() => ({ conversationIniting: false }));
      return true;
    }
    set((state) => ({
      conversationList: limitArraySize([
        ...(isOffset ? state.conversationList : []),
        ...tmpConversationList,
      ], MAX_CONVERSATION_LIST_SIZE),
    }));
    if (!forceLoading && !isOffset) set(() => ({ conversationIniting: false }));
    return tmpConversationList.length === CONVERSATION_SPLIT_COUNT;
  },
  updateConversationList: (
    list: ConversationItem[],
    type: ConversationListUpdateType,
  ) => {
    const idx = list.findIndex(
      (c) => c.conversationID === get().currentConversation?.conversationID,
    );
    if (idx > -1) get().updateCurrentConversation(list[idx]);

    if (type === "filter") {
      set((state) => ({
        conversationList: limitArraySize(
          conversationSort(
            [...list, ...state.conversationList],
            state.conversationList,
          ),
          MAX_CONVERSATION_LIST_SIZE
        ),
      }));
      return;
    }
    let filterArr: ConversationItem[] = [];
    const chids = list.map((ch) => ch.conversationID);
    filterArr = get().conversationList.filter(
      (tc) => !chids.includes(tc.conversationID),
    );

    set(() => ({ 
      conversationList: limitArraySize(
        conversationSort([...list, ...filterArr]), 
        MAX_CONVERSATION_LIST_SIZE
      ) 
    }));
  },
  delConversationByCID: (conversationID: string) => {
    const tmpConversationList = get().conversationList;
    const idx = tmpConversationList.findIndex(
      (cve) => cve.conversationID === conversationID,
    );
    if (idx < 0) {
      return;
    }
    tmpConversationList.splice(idx, 1);
    set(() => ({ conversationList: [...tmpConversationList] }));
  },
  updateCurrentConversation: async (
    conversation?: ConversationItem,
    isJump?: boolean,
  ) => {

    if (!conversation) {
      set(() => ({
        currentConversation: undefined,
        quoteMessage: undefined,
        currentGroupInfo: undefined,
        currentMemberInGroup: undefined,
      }));
      return;
    }
    const prevConversation = get().currentConversation;

    const toggleNewConversation =
      conversation.conversationID !== prevConversation?.conversationID;
    
    if (toggleNewConversation && isGroupSession(conversation.conversationType)) {
      get().getCurrentGroupInfoByReq(conversation.groupID);
      await get().getCurrentMemberInGroupByReq(conversation.groupID);
    }
    
    set(() => ({ currentConversation: { ...conversation } }));
  },
  updateCurrentConversationFields: (fields: Partial<ConversationItem>) => {
    set((state) => ({
      currentConversation: {
        ...state.currentConversation!,
        ...fields,
      },
    }));
  },
  getUnReadCountByReq: async () => {
    try {
      const { data } = await IMSDK.getTotalUnreadMsgCount();
      set(() => ({ unReadCount: data }));
      return data;
    } catch (error) {
      console.error(error);
      return 0;
    }
  },
  updateUnReadCount: (count: number) => {
    set(() => ({ unReadCount: count }));
  },
  getCurrentGroupInfoByReq: async (groupID: string) => {
    let groupInfo: GroupItem;
    try {
      const { data } = await IMSDK.getSpecifiedGroupsInfo([groupID]);
      groupInfo = data[0];
    } catch (error) {
      feedbackToast({ error, msg: t("toast.getGroupInfoFailed") });
      return;
    }
    set(() => ({ currentGroupInfo: { ...groupInfo } }));
  },
  updateCurrentGroupInfo: (groupInfo: GroupItem) => {
    set(() => ({ currentGroupInfo: { ...groupInfo } }));
  },
  getCurrentMemberInGroupByReq: async (groupID: string) => {
    let memberInfo: GroupMemberItem;
    const selfID = useUserStore.getState().selfInfo.userID;
    try {
      const { data } = await IMSDK.getSpecifiedGroupMembersInfo({
        groupID,
        userIDList: [selfID],
      });
      memberInfo = data[0];
    } catch (error) {
      set(() => ({ currentMemberInGroup: undefined }));
      feedbackToast({ error, msg: t("toast.getGroupMemberFailed") });
      return;
    }
    set(() => ({ currentMemberInGroup: memberInfo ? { ...memberInfo } : undefined }));
  },
  setCurrentMemberInGroup: (memberInfo?: GroupMemberItem) => {
    set(() => ({ currentMemberInGroup: memberInfo }));
  },
  tryUpdateCurrentMemberInGroup: (member: GroupMemberItem) => {
    const currentMemberInGroup = get().currentMemberInGroup;
    if (
      member.groupID === currentMemberInGroup?.groupID &&
      member.userID === currentMemberInGroup?.userID
    ) {
      set(() => ({ currentMemberInGroup: { ...member } }));
    }
  },
  setQuoteMessage: (message?: MessageItem) => {
    set(() => ({ quoteMessage: message }));
  },
  clearConversationStore: () => {
    set(() => ({
      conversationList: [],
      currentConversation: undefined,
      unReadCount: 0,
      currentGroupInfo: undefined,
      currentMemberInGroup: undefined,
      quoteMessage: undefined,
    }));
  },
}));
