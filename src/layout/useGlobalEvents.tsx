import { CbEvents, LogLevel } from "@openim/wasm-client-sdk";
import {
  MessageReceiveOptType,
  MessageType,
  SessionType,
} from "@openim/wasm-client-sdk";
import {
  BlackUserItem,
  ConversationItem,
  FriendApplicationItem,
  FriendUserItem,
  GroupApplicationItem,
  GroupItem,
  GroupMemberItem,
  MessageItem,
  RevokedInfo,
  SelfUserInfo,
  WSEvent,
  WsResponse,
  ReceiptInfo,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { Modal, message } from "antd";
import { t } from "i18next";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { BusinessAllowType } from "@/api/login";
import { GetReceiveHistory } from "@/api/login";
import messageRing from "@/assets/audio/newMsg.mp3";
import { CustomType } from "@/constants";
import {
  pushNewMessage,
  updateMessageNicknameAndFaceUrl,
  updateOneMessage,
} from "@/pages/chat/queryChat/useHistoryMessageList";
import { useConversationStore, useUserStore } from "@/store";
import { useContactStore } from "@/store/contact";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import emitter from "@/utils/events";
import { createNotification, initStore, isGroupSession } from "@/utils/imCommon";
import { updateLocalTransferHistory } from "@/utils/imCommon";
import { clearIMProfile, getIMToken, getIMUserID } from "@/utils/storage";
import { ApiAutoRoute } from "@/utils/apiAutoRoute";
import { globalConfig } from "@/utils/globalConfig";
import { startPerformanceLogging } from "@/utils/performanceLogger";

import { IMSDK } from "./MainContentWrap";

export function useGlobalEvent() {
  const navigate = useNavigate();
  const resume = useRef(false);

  // user
  const updateSyncState = useUserStore((state) => state.updateSyncState);
  const updateProgressState = useUserStore((state) => state.updateProgressState);
  const updateReinstallState = useUserStore((state) => state.updateReinstallState);
  const updateIsLogining = useUserStore((state) => state.updateIsLogining);
  const updateConnectState = useUserStore((state) => state.updateConnectState);
  const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);
  const getSelfInfoByReq = useUserStore((state) => state.getSelfInfoByReq);
  const userLogout = useUserStore((state) => state.userLogout);
  // conversation
  const updateConversationList = useConversationStore(
    (state) => state.updateConversationList,
  );
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );
  const updateUnReadCount = useConversationStore((state) => state.updateUnReadCount);
  const updateCurrentGroupInfo = useConversationStore(
    (state) => state.updateCurrentGroupInfo,
  );
  const getCurrentGroupInfoByReq = useConversationStore(
    (state) => state.getCurrentGroupInfoByReq,
  );
  const setCurrentMemberInGroup = useConversationStore(
    (state) => state.setCurrentMemberInGroup,
  );
  const getCurrentMemberInGroupByReq = useConversationStore(
    (state) => state.getCurrentMemberInGroupByReq,
  );
  const tryUpdateCurrentMemberInGroup = useConversationStore(
    (state) => state.tryUpdateCurrentMemberInGroup,
  );
  const getConversationListByReq = useConversationStore(
    (state) => state.getConversationListByReq,
  );
  const getUnReadCountByReq = useConversationStore(
    (state) => state.getUnReadCountByReq,
  );
  // contact
  const getFriendListByReq = useContactStore((state) => state.getFriendListByReq);
  const getGroupListByReq = useContactStore((state) => state.getGroupListByReq);
  const updateFriend = useContactStore((state) => state.updateFriend);
  const pushNewFriend = useContactStore((state) => state.pushNewFriend);
  const updateBlack = useContactStore((state) => state.updateBlack);
  const pushNewBlack = useContactStore((state) => state.pushNewBlack);
  const updateGroup = useContactStore((state) => state.updateGroup);
  const pushNewGroup = useContactStore((state) => state.pushNewGroup);
  const updateRecvFriendApplication = useContactStore(
    (state) => state.updateRecvFriendApplication,
  );
  const updateSendFriendApplication = useContactStore(
    (state) => state.updateSendFriendApplication,
  );
  const updateRecvGroupApplication = useContactStore(
    (state) => state.updateRecvGroupApplication,
  );
  const updateSendGroupApplication = useContactStore(
    (state) => state.updateSendGroupApplication,
  );

  let cacheConversationList = [] as ConversationItem[];
  let audioEl: HTMLAudioElement | null = null;

  useEffect(() => {
    loginCheck();
    if (window.location.hash.includes("live")) {
      return;
    }
    tryLogin();
    cacheConversationList = [];
    setIMListener();
    const cleanupIpcListener = setIpcListener();

    // 启动性能监控 (每15秒打印一次)
    // const performanceInterval = startPerformanceLogging(15000);
    
 

    // 网络状态监听
    const handleOnline = () => {
      IMSDK.networkStatusChanged();
    };
    const handleOffline = () => {
      IMSDK.networkStatusChanged();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      disposeIMListener();
      cleanupIpcListener(); // 清理IPC监听器
      // clearInterval(performanceInterval); // 清理性能监控
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loginCheck = async () => {
    const IMToken = (await getIMToken()) as string;
    const IMUserID = (await getIMUserID()) as string;
    if (!IMToken || !IMUserID) {
      clearIMProfile();
      navigate("/login");
      return;
    }
  };

  const tryLogin = async () => {
    updateIsLogining(true);
    const IMToken = (await getIMToken()) as string;
    const IMUserID = (await getIMUserID()) as string;

    try {
      // 统一使用环境变量配置
      let apiAddr = globalConfig.apiUrl;
      let wsAddr = globalConfig.wsUrl;
      let chatAddr = globalConfig.chatUrl;

    // Electron版本：保持原有逻辑
        if (!wsAddr || (!wsAddr.startsWith("ws://") && !wsAddr.startsWith("wss://"))) {
          const currentHost = window.location.hostname;
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

          // 检查是否为 IP 地址
          const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHost);

          if (isIpAddress && import.meta.env.VITE_WS_URL1) {
            wsAddr = `${protocol}//${currentHost}${import.meta.env.VITE_WS_URL1}`;
          } else {
            wsAddr = `${protocol}//${currentHost}${wsAddr}`;
          }
        }

        // Electron版本：保持原有逻辑
        if (
          !apiAddr ||
          (!apiAddr.startsWith("http://") && !apiAddr.startsWith("https://"))
        ) {
          const currentHost = window.location.hostname;
          const protocol = window.location.protocol;

          // 检查是否为 IP 地址
          const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHost);

          if (isIpAddress && import.meta.env.VITE_API_URL1) {
            apiAddr = `${protocol}//${currentHost}${import.meta.env.VITE_API_URL1}`;
          } else {
            apiAddr = `${protocol}//${currentHost}${apiAddr}`;
          }
        }
      // 更新环境变量
      import.meta.env.VITE_API_URL = apiAddr;
      import.meta.env.VITE_WS_URL = wsAddr;

      if (window.electronAPI) {
        await IMSDK.initSDK({
          platformID: window.electronAPI?.getPlatform() ?? 5,
          apiAddr,
          wsAddr,
          dataDir: window.electronAPI.getDataPath("sdkResources") || "./",
          logFilePath: window.electronAPI.getDataPath("logsPath") || "./",
          logLevel: LogLevel.Info,
          isLogStandardOutput: false,
          systemType: "electron",
        });
        await IMSDK.login({
          userID: IMUserID,
          token: IMToken,
        });
      } else {
        await IMSDK.login({
          userID: IMUserID,
          token: IMToken,
          platformID: 5,
          apiAddr,
          wsAddr,
          logLevel: LogLevel.Info,
        });
      }
      initStore();
    } catch (error) {
      if ((error as WsResponse).errCode !== 10102) {
        navigate("/login");
      }
    }
    updateIsLogining(false);
  };


  const setIMListener = () => {    
    // account
    IMSDK.on(CbEvents.OnSelfInfoUpdated, selfUpdateHandler);
    IMSDK.on(CbEvents.OnConnecting, connectingHandler);
    IMSDK.on(CbEvents.OnConnectFailed, connectFailedHandler);
    IMSDK.on(CbEvents.OnConnectSuccess, connectSuccessHandler);
    IMSDK.on(CbEvents.OnKickedOffline, kickHandler);
    IMSDK.on(CbEvents.OnUserTokenExpired, expiredHandler);
    IMSDK.on(CbEvents.OnUserTokenInvalid, expiredHandler);
    // sync
    IMSDK.on(CbEvents.OnSyncServerStart, syncStartHandler);
    IMSDK.on(CbEvents.OnSyncServerProgress, syncProgressHandler);
    IMSDK.on(CbEvents.OnSyncServerFinish, syncFinishHandler);
    IMSDK.on(CbEvents.OnSyncServerFailed, syncFailedHandler);
    // message
    IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
    IMSDK.on(CbEvents.OnRecvC2CReadReceipt, c2cReadReceipt);
    IMSDK.on(CbEvents.OnNewRecvMessageRevoked, revokedMessageHandler);

    // conversation
    IMSDK.on(CbEvents.OnConversationChanged, conversationChnageHandler);
    IMSDK.on(CbEvents.OnNewConversation, newConversationHandler);
    IMSDK.on(CbEvents.OnTotalUnreadMessageCountChanged, totalUnreadChangeHandler);
    // friend
    IMSDK.on(CbEvents.OnFriendInfoChanged, friednInfoChangeHandler);
    IMSDK.on(CbEvents.OnFriendAdded, friednAddedHandler);
    IMSDK.on(CbEvents.OnFriendDeleted, friednDeletedHandler);
    // blacklist
    IMSDK.on(CbEvents.OnBlackAdded, blackAddedHandler);
    IMSDK.on(CbEvents.OnBlackDeleted, blackDeletedHandler);
    // group
    IMSDK.on(CbEvents.OnJoinedGroupAdded, joinedGroupAddedHandler);
    IMSDK.on(CbEvents.OnJoinedGroupDeleted, joinedGroupDeletedHandler);
    IMSDK.on(CbEvents.OnGroupDismissed, joinedGroupDismissHandler);
    IMSDK.on(CbEvents.OnGroupInfoChanged, groupInfoChangedHandler);
    IMSDK.on(CbEvents.OnGroupMemberAdded, groupMemberAddedHandler);
    IMSDK.on(CbEvents.OnGroupMemberDeleted, groupMemberDeletedHandler);
    IMSDK.on(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
    // application
    IMSDK.on(CbEvents.OnFriendApplicationAdded, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnFriendApplicationAccepted, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnFriendApplicationRejected, friendApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationAdded, groupApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationAccepted, groupApplicationProcessedHandler);
    IMSDK.on(CbEvents.OnGroupApplicationRejected, groupApplicationProcessedHandler);
  };

  const selfUpdateHandler = ({ data }: WSEvent<SelfUserInfo>) => {
    updateMessageNicknameAndFaceUrl({
      sendID: data.userID,
      senderNickname: data.nickname,
      senderFaceUrl: data.faceURL,
    });
    updateSelfInfo(data);
  };
  const connectingHandler = () => {
    updateConnectState("loading");
  };
  const connectFailedHandler = ({ errCode, errMsg }: WSEvent) => {
    updateConnectState("failed");
    console.error("connectFailedHandler", errCode, errMsg);

    if (errCode === 705) {
      tryOut(t("toast.loginExpiration"));
    }
  };
  const connectSuccessHandler = async () => {
    updateConnectState("success");
    
    // 检查是否有待添加的邀请人
    const pendingInviteUserID = localStorage.getItem("pending_invite_user_id");
    if (pendingInviteUserID) {
      try {
        await IMSDK.addFriend({
          toUserID: pendingInviteUserID,
          reqMsg: t("toast.autoAddFriendByInvite") || "感谢邀请，系统自动添加好友"
        });
        message.success(t("toast.sendFreiendRequestSuccess") || "好友申请发送成功");
        // 清除存储的邀请人ID
        localStorage.removeItem("pending_invite_user_id");
      } catch (error) {
        // 如果添加失败，可以选择保留邀请人ID或显示错误信息
        message.error(t("toast.sendFreiendRequestFail") || "好友申请发送失败");
      }
    }
  };
  // const kickHandler = () => tryOut(t("toast.accountKicked"));
  const kickHandler = () => {
    Modal.confirm({
      content: t("toast.AccountLoggedInElsewhere"),
      onOk: () => {
        window.location.reload();
      },
      onCancel: () => {
        navigate("/login");
        setTimeout(() => {
          window.close();
        }, 100);
      },
      okText: t("toast.KeepCurrentPage"),
      cancelText: t("toast.DestroyCurrentPage"),
    });
  };
  const expiredHandler = () => tryOut(t("toast.loginExpiration"));

  const tryOut = (msg: string) =>
    feedbackToast({
      msg,
      error: msg,
      onClose: () => {
        userLogout(true);
      },
    });

  // const listenForRedPackets = () => {
  // IMSDK.on(CbEvents.OnRecvNewMessages, ({ data }: { data: MessageItem[] }) => {
  //   data.forEach((message) => {
  //     if (message.contentType === "custom" && message.customElem) {
  //       const customData = JSON.parse(message.customElem.data);
  //       if (customData.customType === CustomType.RedPacket) {
  //         // 展示红包 UI
  //         showRedPacketUI(customData.data);
  //       } else if (customData.customType === CustomType.RedPacketClaim) {
  //         // 更新红包状态
  //         updateRedPacketStatus(customData.data.redPacketID, "claimed");
  //       }
  //     }
  //   });
  // });
  // };

  // sync
  const syncStartHandler = ({ data }: WSEvent<boolean>) => {
    updateSyncState("loading");
    updateReinstallState(data);
  };
  const syncProgressHandler = ({ data }: WSEvent<number>) => {
    updateProgressState(data);
  };
  const syncFinishHandler = () => {
    updateSyncState("success");
    getFriendListByReq();
    getGroupListByReq();
    getConversationListByReq(false, true);
    getUnReadCountByReq();
  };
  const syncFailedHandler = () => {
    updateSyncState("failed");
    feedbackToast({ msg: t("toast.syncFailed"), error: t("toast.syncFailed") });
  };

  // message
  const newMessageHandler = ({ data }: WSEvent<MessageItem[]>) => {    
    if (useUserStore.getState().syncState === "loading" || resume.current) {
      return;
    }
    data.map((message) => handleNewMessage(message));
  };



  const revokedMessageHandler = ({ data }: WSEvent<RevokedInfo>) => {
    updateOneMessage({
      clientMsgID: data.clientMsgID,
      contentType: MessageType.RevokeMessage,
      notificationElem: {
        detail: JSON.stringify(data),
      },
    } as MessageItem);
  };

  const newMessageNotify = async (newServerMsg: MessageItem) => {
    if (useUserStore.getState().syncState === "loading") {
      return;
    }

    const selfInfo = useUserStore.getState().selfInfo;

    if (
      selfInfo.allowBeep === BusinessAllowType.NotAllow ||
      selfInfo.globalRecvMsgOpt !== MessageReceiveOptType.Normal
    ) {
      return;
    }

    let cveItem = [
      ...useConversationStore.getState().conversationList,
      ...cacheConversationList,
    ].find((conversation) => {
      if (isGroupSession(newServerMsg.sessionType)) {
        return newServerMsg.groupID === conversation.groupID;
      }
      return newServerMsg.sendID === conversation.userID;
    });

    if (!cveItem) {
      try {
        const { data } = await IMSDK.getOneConversation({
          sessionType: newServerMsg.sessionType,
          sourceID: newServerMsg.groupID || newServerMsg.sendID,
        });
        cveItem = data;
        cacheConversationList = [...cacheConversationList, { ...cveItem }];
      } catch (e) {
        return;
      }
    }

    if (cveItem.recvMsgOpt !== MessageReceiveOptType.Normal) {
      return;
    }

    createNotification({
      message: newServerMsg,
      conversation: cveItem,
      callback: async (conversation) => {
        if (
          useConversationStore.getState().currentConversation?.conversationID ===
          conversation.conversationID
        )
          return;
        await updateCurrentConversation({ ...conversation, unreadCount: 1 });
        navigate(`/chat/${conversation.conversationID}`);
      },
    });

    if (!audioEl) {
      audioEl = document.createElement("audio");
    }
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.src = messageRing;
    audioEl.play().catch(() => {});
  };

  const notPushType = [MessageType.TypingMessage, MessageType.RevokeMessage];

  const handleNewMessage = (newServerMsg: MessageItem) => {        
    if (newServerMsg.contentType === MessageType.CustomMessage) {
      const customData = JSON.parse(newServerMsg.customElem!.data);

      if (customData.customType === 10011 ) {
        
        if(customData.content==="RolePermissionChanges"||customData.content==="UserRoleChanges"){
          getSelfInfoByReq()
        }
      }

      if (customData.customType === 10086 || customData.customType === 1001) {
        // 处理转账消息
        const { data: transferData } = customData;
        if (transferData.status === "completed") {
          // 获取最新的转账历史并更新本地存储
          GetReceiveHistory().then((historyResponse: any) => {
            if (historyResponse?.errCode === 0 && historyResponse?.data) {
              updateLocalTransferHistory(historyResponse.data.records);
              // 触发UI更新
              emitter.emit("TRANSFER_STATUS_UPDATED", {
                transferId: transferData.msg_id,
                status: "completed",
              });
            }
          });
        }
      }

      if (
        CustomType.CallingInvite <= customData.customType &&
        customData.customType <= CustomType.CallingHungup
      ) {
        return;
      }
    }

    const needNotification =
      !notPushType.includes(newServerMsg.contentType) &&
      newServerMsg.sendID !== useUserStore.getState().selfInfo.userID;

    if (needNotification) {
      if (
        document.visibilityState === "hidden" ||
        !inCurrentConversation(newServerMsg)
      ) {
        newMessageNotify(newServerMsg);
      }
    }

    if (!inCurrentConversation(newServerMsg)) return;

    if (!notPushType.includes(newServerMsg.contentType)) {      
      pushNewMessage(newServerMsg);
    }
  };

  const inCurrentConversation = (newServerMsg: MessageItem) => {
    switch (newServerMsg.sessionType) {
      case SessionType.Single:
        return (
          newServerMsg.sendID ===
          useConversationStore.getState().currentConversation?.userID ||
          (newServerMsg.sendID === useUserStore.getState().selfInfo.userID &&
            newServerMsg.recvID ===
            useConversationStore.getState().currentConversation?.userID)
        );
      case SessionType.Group:
      case SessionType.WorkingGroup:
        return (
          newServerMsg.groupID ===
          useConversationStore.getState().currentConversation?.groupID
        );
      case SessionType.Notification:
        return (
          newServerMsg.sendID ===
          useConversationStore.getState().currentConversation?.userID
        );
      default:
        return false;
    }
  };

  // conversation
  const c2cReadReceipt = ({ data }: WSEvent<ReceiptInfo[]>) => {
    const receipt = data[0];
    receipt.msgIDList.forEach((msgID) => {
      updateOneMessage({
        clientMsgID: msgID,
        isRead: true,
      } as MessageItem);
    });
  };

  // 🔥 优化：批量会话更新处理
  let pendingConversationUpdates: ConversationItem[] = [];
  let batchUpdateTimer: NodeJS.Timeout | null = null;
  let lastUpdateTime = Date.now();
  
  // 🔥 动态调整更新间隔：消息多时更快更新，消息少时慢一些
  const getUpdateInterval = () => {
    const pendingCount = pendingConversationUpdates.length;
    if (pendingCount > 20) return 300;  // 大量消息：300ms
    if (pendingCount > 10) return 500;  // 中量消息：500ms
    if (pendingCount > 5) return 700;   // 少量消息：700ms
    return 1000;                        // 极少消息：1000ms
  };

  // 🔥 启动批量更新定时器
  const startBatchUpdateTimer = () => {
    if (batchUpdateTimer) {
      clearInterval(batchUpdateTimer);
    }
    
    const interval = getUpdateInterval();
    
    batchUpdateTimer = setInterval(() => {
      if (pendingConversationUpdates.length > 0) {        
        // 🔥 去重并保留最新的数据
        const uniqueUpdates = new Map<string, ConversationItem>();
        pendingConversationUpdates.forEach(conv => {
          const existing = uniqueUpdates.get(conv.conversationID);
          if (!existing || conv.latestMsgSendTime > existing.latestMsgSendTime) {
            uniqueUpdates.set(conv.conversationID, conv);
          }
        });
        
        const mergedUpdates = Array.from(uniqueUpdates.values());
        
        updateConversationList(mergedUpdates, "filter");
        // 🔥 清空缓存
        pendingConversationUpdates = [];
        lastUpdateTime = Date.now();
      }
    }, interval);
  };

  const conversationChnageHandler = ({ data }: WSEvent<ConversationItem[]>) => {   
    updateConversationList(data, "filter");
 
    // // 🔥 缓存推送的会话更新
    // pendingConversationUpdates.push(...data);
    
    // // 🔥 启动批量更新定时器
    // startBatchUpdateTimer();
  };

  const newConversationHandler = ({ data }: WSEvent<ConversationItem[]>) => {    
    updateConversationList(data, "push");
  };
  const totalUnreadChangeHandler = ({ data }: WSEvent<number>) => {
    if (data === useConversationStore.getState().unReadCount) return;
    updateUnReadCount(data);
  };

  // friend
  const friednInfoChangeHandler = ({ data }: WSEvent<FriendUserItem>) => {
    if (data.userID === useConversationStore.getState().currentConversation?.userID) {
      updateMessageNicknameAndFaceUrl({
        sendID: data.userID,
        senderNickname: data.remark || data.nickname,
        senderFaceUrl: data.faceURL,
      });
    }
    updateFriend(data);
  };
  const friednAddedHandler = ({ data }: WSEvent<FriendUserItem>) => {
    pushNewFriend(data);
  };
  const friednDeletedHandler = ({ data }: WSEvent<FriendUserItem>) => {
    updateFriend(data, true);
  };

  // blacklist
  const blackAddedHandler = ({ data }: WSEvent<BlackUserItem>) => {
    pushNewBlack(data);
  };
  const blackDeletedHandler = ({ data }: WSEvent<BlackUserItem>) => {
    IMSDK.getSpecifiedFriendsInfo({
      friendUserIDList: [data.userID],
    }).then(({ data }) => {
      if (data.length) {
        pushNewFriend(data[0]);
      }
    });
    updateBlack(data, true);
  };

  // group
  const joinedGroupAddedHandler = ({ data }: WSEvent<GroupItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateCurrentGroupInfo(data);
      getCurrentMemberInGroupByReq(data.groupID);
    }
    pushNewGroup(data);
  };
  const joinedGroupDeletedHandler = ({ data }: WSEvent<GroupItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      getCurrentGroupInfoByReq(data.groupID);
      setCurrentMemberInGroup();
    }
    updateGroup(data, true);
  };
  const joinedGroupDismissHandler = ({ data }: WSEvent<GroupItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      getCurrentMemberInGroupByReq(data.groupID);
    }
  };
  const groupInfoChangedHandler = ({ data }: WSEvent<GroupItem>) => {
    updateGroup(data);
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateCurrentGroupInfo(data);
    }
  };
  const groupMemberAddedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (
      data.groupID === useConversationStore.getState().currentConversation?.groupID &&
      data.userID === useUserStore.getState().selfInfo.userID
    ) {
      getCurrentMemberInGroupByReq(data.groupID);
    }
  };
  const groupMemberDeletedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (
      data.groupID === useConversationStore.getState().currentConversation?.groupID &&
      data.userID === useUserStore.getState().selfInfo.userID
    ) {
      getCurrentMemberInGroupByReq(data.groupID);
    }
  };
  const groupMemberInfoChangedHandler = ({ data }: WSEvent<GroupMemberItem>) => {
    if (data.groupID === useConversationStore.getState().currentConversation?.groupID) {
      updateMessageNicknameAndFaceUrl({
        sendID: data.userID,
        senderNickname: data.nickname,
        senderFaceUrl: data.faceURL,
      });
      tryUpdateCurrentMemberInGroup(data);
    }
  };

  //application
  const friendApplicationProcessedHandler = ({
    data,
  }: WSEvent<FriendApplicationItem>) => {
    const isRecv = data.toUserID === useUserStore.getState().selfInfo.userID;
    if (isRecv) {
      updateRecvFriendApplication(data);
    } else {
      updateSendFriendApplication(data);
    }
  };
  const groupApplicationProcessedHandler = ({
    data,
  }: WSEvent<GroupApplicationItem>) => {
    const isRecv = data.userID !== useUserStore.getState().selfInfo.userID;
    if (isRecv) {
      updateRecvGroupApplication(data);
    } else {
      updateSendGroupApplication(data);
    }
  };

  const disposeIMListener = () => {
    IMSDK.off(CbEvents.OnSelfInfoUpdated, selfUpdateHandler);
    IMSDK.off(CbEvents.OnConnecting, connectingHandler);
    IMSDK.off(CbEvents.OnConnectFailed, connectFailedHandler);
    IMSDK.off(CbEvents.OnConnectSuccess, connectSuccessHandler);
    IMSDK.off(CbEvents.OnKickedOffline, kickHandler);
    IMSDK.off(CbEvents.OnUserTokenExpired, expiredHandler);
    IMSDK.off(CbEvents.OnUserTokenInvalid, expiredHandler);
    // sync
    IMSDK.off(CbEvents.OnSyncServerStart, syncStartHandler);
    IMSDK.off(CbEvents.OnSyncServerProgress, syncProgressHandler);
    IMSDK.off(CbEvents.OnSyncServerFinish, syncFinishHandler);
    IMSDK.off(CbEvents.OnSyncServerFailed, syncFailedHandler);
    // message
    IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
    IMSDK.off(CbEvents.OnRecvC2CReadReceipt, c2cReadReceipt);
    // conversation
    IMSDK.off(CbEvents.OnConversationChanged, conversationChnageHandler);
    IMSDK.off(CbEvents.OnNewConversation, newConversationHandler);
    IMSDK.off(CbEvents.OnTotalUnreadMessageCountChanged, totalUnreadChangeHandler);
    // friend
    IMSDK.off(CbEvents.OnFriendInfoChanged, friednInfoChangeHandler);
    IMSDK.off(CbEvents.OnFriendAdded, friednAddedHandler);
    IMSDK.off(CbEvents.OnFriendDeleted, friednDeletedHandler);
    // blacklist
    IMSDK.off(CbEvents.OnBlackAdded, blackAddedHandler);
    IMSDK.off(CbEvents.OnBlackDeleted, blackDeletedHandler);
    // group
    IMSDK.off(CbEvents.OnJoinedGroupAdded, joinedGroupAddedHandler);
    IMSDK.off(CbEvents.OnJoinedGroupDeleted, joinedGroupDeletedHandler);
    IMSDK.off(CbEvents.OnGroupDismissed, joinedGroupDismissHandler);
    IMSDK.off(CbEvents.OnGroupInfoChanged, groupInfoChangedHandler);
    IMSDK.off(CbEvents.OnGroupMemberAdded, groupMemberAddedHandler);
    IMSDK.off(CbEvents.OnGroupMemberDeleted, groupMemberDeletedHandler);
    IMSDK.off(CbEvents.OnGroupMemberInfoChanged, groupMemberInfoChangedHandler);
    // application
    IMSDK.off(CbEvents.OnFriendApplicationAdded, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnFriendApplicationAccepted, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnFriendApplicationRejected, friendApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationAdded, groupApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationAccepted, groupApplicationProcessedHandler);
    IMSDK.off(CbEvents.OnGroupApplicationRejected, groupApplicationProcessedHandler);
  };

  const setIpcListener = () => {
    let resumeTimeoutId: NodeJS.Timeout;
    
    window.electronAPI?.subscribe("appResume", () => {
      if (resume.current) {
        return;
      }
      resume.current = true;
      
      // 清理之前的定时器
      if (resumeTimeoutId) {
        clearTimeout(resumeTimeoutId);
      }
      
      resumeTimeoutId = setTimeout(() => {
        resume.current = false;
      }, 5000);
    });
    
    // 返回清理函数
    return () => {
      if (resumeTimeoutId) {
        clearTimeout(resumeTimeoutId);
      }
    };
  };
}