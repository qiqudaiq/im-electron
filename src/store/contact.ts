import { ApplicationHandleResult } from "@openim/wasm-client-sdk";
import {
  BlackUserItem,
  FriendApplicationItem,
  FriendUserItem,
  GroupApplicationItem,
  GroupItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { t } from "i18next";
import { create } from "zustand";

import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import {
  getAccessedFriendApplication,
  getAccessedGroupApplication,  
  getIMToken,
} from "@/utils/storage";

import { ContactStore } from "./type";

// 内存限制常量 - 只限制申请列表
const MAX_APPLICATION_LIST_SIZE = 1000; // 最大申请列表大小

// 限制申请列表大小的辅助函数
const limitApplicationArraySize = <T>(array: T[], maxSize: number): T[] => {
  if (array.length > maxSize) {
    // 保留最新的申请数据
    return array.slice(-maxSize);
  }
  return array;
};

export const useContactStore = create<ContactStore>()((set, get) => ({
  friendList: [],
  blackList: [],
  groupList: [],
  recvFriendApplicationList: [],
  sendFriendApplicationList: [],
  recvGroupApplicationList: [],
  sendGroupApplicationList: [],
  unHandleFriendApplicationCount: 0,
  unHandleGroupApplicationCount: 0,
  getFriendListByReq: async () => {
    try {
      let offset = 0;
      let tmpList = [] as FriendUserItem[];
      let initialFetch = true;
      // eslint-disable-next-line
      while (true) {
        const count = initialFetch ? 10000 : 1000;
        const { data } = await IMSDK.getFriendListPage({
          offset,
          count,
          filterBlack: true,
        });        
        tmpList = [...tmpList, ...data];
        offset += count;
        if (data.length < count) break;
        initialFetch = false;
      }
      
      set(() => ({
        friendList: tmpList, // 不再限制好友列表大小
      }));
    } catch (error) {
      feedbackToast({ error, msg: t("toast.getFriendListFailed") });
    }
  },
  setFriendList: (list: FriendUserItem[]) => {
    set(() => ({ friendList: list })); // 不再限制好友列表大小
  },
  updateFriend: (friend: FriendUserItem, remove?: boolean) => {
    const tmpList = [...get().friendList];
    const idx = tmpList.findIndex((f) => f.userID === friend.userID);
    if (idx < 0) {
      return;
    }
    if (remove) {
      tmpList.splice(idx, 1);
    } else {
      tmpList[idx] = { ...friend };
    }
    set(() => ({ friendList: tmpList })); // 不再限制好友列表大小
  },
  pushNewFriend: (friend: FriendUserItem) => {
    set((state) => ({ 
      friendList: [...state.friendList, friend] // 不再限制好友列表大小
    }));
  },
  getBlackListByReq: async () => {
    const IMToken = await getIMToken();
    if (!IMToken) {
      return;
    }
    try {
      const { data } = await IMSDK.getBlackList();
      set(() => ({ blackList: data }));
    } catch (error) {
      // feedbackToast({ error, msg: t("toast.getBlackListFailed") });
    }
  },
  updateBlack: (black: BlackUserItem, remove?: boolean) => {
    const tmpList = [...get().blackList];
    const idx = tmpList.findIndex((b) => b.userID === black.userID);
    if (idx < 0) {
      return;
    }
    if (remove) {
      tmpList.splice(idx, 1);
    } else {
      tmpList[idx] = { ...black };
    }
    set(() => ({ blackList: tmpList }));
  },
  pushNewBlack: (black: BlackUserItem) => {
    const isFriend = get().friendList.find((f) => f.userID === black.userID);
    set((state) => ({
      blackList: [...state.blackList, black],
      friendList: !isFriend
        ? state.friendList
        : state.friendList.filter((f) => f.userID !== black.userID), // 不再限制好友列表大小
    }));
  },
  getGroupListByReq: async () => {
    try {
      let offset = 0;
      let tmpList = [] as GroupItem[];
      // eslint-disable-next-line
      while (true) {
        const { data } = await IMSDK.getJoinedGroupListPage({ offset, count: 1000 });
        tmpList = [...tmpList, ...data];
        offset += 1000;
        if (data.length < 1000) break;
      }

      set(() => ({ groupList: tmpList })); // 不再限制群组列表大小
    } catch (error) {
      feedbackToast({ error, msg: t("toast.getGroupListFailed") });
    }
  },
  setGroupList: (list: GroupItem[]) => {
    set(() => ({ groupList: list })); // 不再限制群组列表大小
  },
  updateGroup: (group: GroupItem, remove?: boolean) => {
    const tmpList = [...get().groupList];
    const idx = tmpList.findIndex((g) => g.groupID === group.groupID);
    if (idx < 0) {
      return;
    }
    if (remove) {
      tmpList.splice(idx, 1);
    } else {
      tmpList[idx] = { ...group };
    }
    set(() => ({ groupList: tmpList })); // 不再限制群组列表大小
  },
  pushNewGroup: (group: GroupItem) => {
    set((state) => ({ 
      groupList: [...state.groupList, group] // 不再限制群组列表大小
    }));
  },
  getRecvFriendApplicationListByReq: async () => {
    try {
      const { data } = await IMSDK.getFriendApplicationListAsRecipient();
      set(() => ({ 
        recvFriendApplicationList: limitApplicationArraySize(data, MAX_APPLICATION_LIST_SIZE) 
      }));
    } catch (error) {
      console.error(error);
    }
  },
  updateRecvFriendApplication: async (application: FriendApplicationItem) => {
    let tmpList = [...get().recvFriendApplicationList];
    let isHandleResultUpdate = false;
    const idx = tmpList.findIndex((a) => a.fromUserID === application.fromUserID);
    if (idx < 0) {
      tmpList = [...tmpList, application];
    } else {
      isHandleResultUpdate = true;
      tmpList[idx] = { ...application };
    }
    if (idx < 0 || isHandleResultUpdate) {
      const accessedFriendApplications = await getAccessedFriendApplication();
      const limitedList = limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE);
      const unHandleFriendApplicationCount = limitedList.filter(
        (application) =>
          application.handleResult === 0 &&
          !accessedFriendApplications.includes(
            `${application.fromUserID}_${application.createTime}`,
          ),
      ).length;
      set(() => ({
        recvFriendApplicationList: limitedList,
        unHandleFriendApplicationCount,
      }));
      return;
    }
    set(() => ({ 
      recvFriendApplicationList: limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE) 
    }));
  },
  getSendFriendApplicationListByReq: async () => {
    try {
      const { data } = await IMSDK.getFriendApplicationListAsApplicant();
      set(() => ({ 
        sendFriendApplicationList: limitApplicationArraySize(data, MAX_APPLICATION_LIST_SIZE) 
      }));
    } catch (error) {
      console.error(error);
    }
  },
  updateSendFriendApplication: (application: FriendApplicationItem) => {
    let tmpList = [...get().sendFriendApplicationList];
    const idx = tmpList.findIndex((a) => a.toUserID === application.toUserID);
    if (idx < 0) {
      tmpList = [...tmpList, application];
    } else {
      tmpList[idx] = { ...application };
    }
    set(() => ({ 
      sendFriendApplicationList: limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE) 
    }));
  },
  getRecvGroupApplicationListByReq: async () => {
    try {
      const { data } = await IMSDK.getGroupApplicationListAsRecipient();
      set(() => ({ 
        recvGroupApplicationList: limitApplicationArraySize(data, MAX_APPLICATION_LIST_SIZE) 
      }));
    } catch (error) {
      console.error(error);
    }
  },
  updateRecvGroupApplication: async (application: GroupApplicationItem) => {
    let tmpList = [...get().recvGroupApplicationList];
    let isHandleResultUpdate = false;
    const idx = tmpList.findIndex((a) => a.userID === application.userID);
    if (idx < 0) {
      tmpList = [...tmpList, application];
    } else {
      isHandleResultUpdate = true;
      tmpList[idx] = { ...application };
    }
    if (idx < 0 || application.handleResult === ApplicationHandleResult.Unprocessed) {
      const accessedGroupApplications = await getAccessedGroupApplication();
      const limitedList = limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE);
      const unHandleGroupApplicationCount = limitedList.filter(
        (application) =>
          application.handleResult === 0 &&
          !accessedGroupApplications.includes(
            `${application.userID}_${application.reqTime}`,
          ),
      ).length;
      set(() => ({ 
        recvGroupApplicationList: limitedList, 
        unHandleGroupApplicationCount 
      }));
      return;
    }
    set(() => ({ 
      recvGroupApplicationList: limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE) 
    }));
  },
  getSendGroupApplicationListByReq: async () => {
    try {
      const { data } = await IMSDK.getGroupApplicationListAsApplicant();
      set(() => ({ 
        sendGroupApplicationList: limitApplicationArraySize(data, MAX_APPLICATION_LIST_SIZE) 
      }));
    } catch (error) {
      console.error(error);
    }
  },
  updateSendGroupApplication: (application: GroupApplicationItem) => {
    let tmpList = [...get().sendGroupApplicationList];
    const idx = tmpList.findIndex((a) => a.groupID === application.groupID);
    if (idx < 0) {
      tmpList = [...tmpList, application];
    } else {
      tmpList[idx] = { ...application };
    }
    set(() => ({ 
      sendGroupApplicationList: limitApplicationArraySize(tmpList, MAX_APPLICATION_LIST_SIZE) 
    }));
  },
  updateUnHandleFriendApplicationCount: (num: number) => {
    set(() => ({ unHandleFriendApplicationCount: num }));
  },
  updateUnHandleGroupApplicationCount: (num: number) => {
    set(() => ({ unHandleGroupApplicationCount: num }));
  },
  clearContactStore: () => {
    set(() => ({
      friendList: [],
      blackList: [],
      groupList: [],
      recvFriendApplicationList: [],
      sendFriendApplicationList: [],
      recvGroupApplicationList: [],
      sendGroupApplicationList: [],
      unHandleFriendApplicationCount: 0,
      unHandleGroupApplicationCount: 0,
    }));
  },
}));
