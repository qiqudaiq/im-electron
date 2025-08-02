import dayjs from "dayjs";
import { v4 as uuidV4 } from "uuid";
import calendar from "dayjs/plugin/calendar";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import { t } from "i18next";
import default_group from "@/assets/images/contact/my_groups.png";
import { v4 as uuidv4 } from "uuid";

import { CustomType, GroupSessionTypes, SystemMessageTypes } from "@/constants/im";
import { useConversationStore, useUserStore } from "@/store";
import { useContactStore } from "@/store/contact";

import { generateAvatar, secondsToTime } from "./common";
import {
  AtTextElem,
  ConversationItem,
  MessageItem,
  PublicUserItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { GroupAtType, MessageType, SessionType } from "@openim/wasm-client-sdk";
import { isThisYear } from "date-fns";
import { getAccessedFriendApplication, getAccessedGroupApplication } from "./storage";
import { FileWithPath } from "@/pages/chat/queryChat/ChatFooter/SendActionBar/useFileMessage";
import { IMSDK } from "@/layout/MainContentWrap";
import { UploadFileParams } from "@openim/wasm-client-sdk/lib/types/params";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";

dayjs.extend(calendar);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
  calendar: {
    sameDay: "HH:mm",
    nextDay: "[tomorrow]",
    nextWeek: "dddd",
    lastDay: "[yesterday] HH:mm",
    lastWeek: "dddd HH:mm",
    sameElse: "YYYY/M/D HH:mm",
  },
});
dayjs.updateLocale("zh-cn", {
  calendar: {
    sameDay: "HH:mm",
    nextDay: "[明天]",
    nextWeek: "dddd",
    lastDay: "[昨天] HH:mm",
    lastWeek: "dddd HH:mm",
    sameElse: "YYYY年M月D日 HH:mm",
  },
});

export const AddFriendQrCodePrefix = "io.openim.app/addFriend/";
export const AddGroupQrCodePrefix = "io.openim.app/joinGroup/";

const linkWrap = ({
  userID,
  groupID,
  name,
  fromAt,
}: {
  userID: string;
  groupID: string;
  name: string;
  fromAt?: boolean;
}) => {
  return `<span class='link-el${fromAt ? "" : " member-el"
    } max-w-[200px] truncate inline-block align-bottom' onclick='userClick("${userID}","${groupID ?? ""
    }")'>${name}</span>`;
};

export const notificationMessageFormat = (msg: MessageItem) => {
  const selfID = useUserStore.getState().selfInfo.userID;
  const getName = (user: PublicUserItem) => {
    return user.userID === selfID ? t("you") : user.nickname;
  };
  try {
    switch (msg.contentType) {
      case MessageType.FriendAdded:
        return t("messageDescription.alreadyFriendMessage");
      case MessageType.CustomMessage:
        const customData = JSON.parse(msg.customElem!.data);
        if (customData.customType === 10086) {
          return `转账消息：${customData.data.total_amount} ${customData.data.currency}`;
        }
        if (customData.customType === 1001) {
          return `红包消息：${customData.data.total_amount} ${customData.data.currency}`;
        }

        return t("messageDescription.customMessage");
      case MessageType.RevokeMessage:
        const data = JSON.parse(msg.notificationElem!.detail);
        const operator = data.revokerID === selfID ? t("you") : data.revokerNickname;
        const revoker =
          data.sourceMessageSendID === selfID
            ? t("you")
            : data.sourceMessageSenderNickname;
        const isAdminRevoke = data.revokerID !== data.sourceMessageSendID;

        // 检查是否是群组消息的管理员撤回
        if (isAdminRevoke) {
          // 根据 revokerRole 确定是管理员还是群主
          const roleText =
            data.revokerRole === 2
              ? t("placeholder.groupOwner")
              : data.revokerRole === 1
                ? t("placeholder.administrator")
                : "";

          return t("messageDescription.advanceRevokeMessage", {
            operator: linkWrap({
              userID: data.revokerID,
              groupID: msg.groupID,
              name: operator,
            }),
            revoker: linkWrap({
              userID: data.sourceMessageSendID,
              groupID: msg.groupID,
              name: revoker,
            }),
          });
        }
        return t("messageDescription.revokeMessage", {
          revoker: linkWrap({
            userID: data.revokerID,
            groupID: msg.groupID,
            name: operator,
          }),
        });
      case MessageType.GroupCreated:
        const groupCreatedDetail = JSON.parse(msg.notificationElem!.detail);
        const groupCreatedUser = groupCreatedDetail.opUser;
        return t("messageDescription.createGroupMessage", {
          creator: linkWrap({
            userID: groupCreatedUser.userID,
            groupID: msg.groupID,
            name: getName(groupCreatedUser),
          }),
        });
      case MessageType.GroupInfoUpdated:
        const groupUpdateDetail = JSON.parse(msg.notificationElem!.detail);
        const groupUpdateUser = groupUpdateDetail.opUser;
        return t("messageDescription.updateGroupInfoMessage", {
          operator: linkWrap({
            userID: groupUpdateUser.userID,
            groupID: msg.groupID,
            name: getName(groupUpdateUser),
          }),
        });
      case MessageType.GroupOwnerTransferred:
        const transferDetails = JSON.parse(msg.notificationElem!.detail);
        const transferOpUser = transferDetails.opUser;
        const newOwner = transferDetails.newGroupOwner;
        return t("messageDescription.transferGroupMessage", {
          owner: linkWrap({
            userID: transferOpUser.userID,
            groupID: msg.groupID,
            name: getName(transferOpUser),
          }),
          newOwner: linkWrap({
            userID: newOwner.userID,
            groupID: msg.groupID,
            name: getName(newOwner),
          }),
        });
      case MessageType.MemberQuit:
        const quitDetails = JSON.parse(msg.notificationElem!.detail);
        const quitUser = quitDetails.quitUser;
        return t("messageDescription.quitGroupMessage", {
          name: linkWrap({
            userID: quitUser.userID,
            groupID: msg.groupID,
            name: getName(quitUser),
          }),
        });
      case MessageType.MemberInvited:
        const inviteDetails = JSON.parse(msg.notificationElem!.detail);
        const inviteOpUser = inviteDetails.opUser;
        const invitedUserList = inviteDetails.invitedUserList ?? [];
        let inviteStr = "";
        invitedUserList.slice(0, 3).map(
          (user: any) =>
          (inviteStr += `${linkWrap({
            userID: user.userID,
            groupID: msg.groupID,
            name: getName(user),
          })}、`),
        );
        inviteStr = inviteStr.slice(0, -1);
        return t("messageDescription.invitedToGroupMessage", {
          operator: linkWrap({
            userID: inviteOpUser.userID,
            groupID: msg.groupID,
            name: getName(inviteOpUser),
          }),
          invitedUser: `${inviteStr}${invitedUserList.length > 3
              ? `${t("placeholder.and")}${t("placeholder.somePerson", {
                num: invitedUserList.length,
              })}`
              : ""
            }`,
        });
      case MessageType.MemberKicked:
        const kickDetails = JSON.parse(msg.notificationElem!.detail);
        const kickOpUser = kickDetails.opUser;
        const kickdUserList = kickDetails.kickedUserList ?? [];
        let kickStr = "";
        kickdUserList.slice(0, 3).map(
          (user: any) =>
          (kickStr += `${linkWrap({
            userID: user.userID,
            groupID: msg.groupID,
            name: getName(user),
          })}、`),
        );
        kickStr = kickStr.slice(0, -1);
        return t("messageDescription.kickInGroupMessage", {
          operator: linkWrap({
            userID: kickOpUser.userID,
            groupID: msg.groupID,
            name: getName(kickOpUser),
          }),
          kickedUser: `${kickStr}${kickdUserList.length > 3 ? "..." : ""}`,
        });
      case MessageType.MemberEnter:
        const enterDetails = JSON.parse(msg.notificationElem!.detail);
        const enterUser = enterDetails.entrantUser;
        return t("messageDescription.joinGroupMessage", {
          name: linkWrap({
            userID: enterUser.userID,
            groupID: msg.groupID,
            name: getName(enterUser),
          }),
        });
      case MessageType.GroupDismissed:
        const dismissDetails = JSON.parse(msg.notificationElem!.detail);
        const dismissUser = dismissDetails.opUser;
        return t("messageDescription.disbanedGroupMessage", {
          operator: linkWrap({
            userID: dismissUser.userID,
            groupID: msg.groupID,
            name: getName(dismissUser),
          }),
        });
      case MessageType.GroupMuted:
        const GROUPMUTEDDetails = JSON.parse(msg.notificationElem!.detail);
        const groupMuteOpUser = GROUPMUTEDDetails.opUser;
        return t("messageDescription.allMuteMessage", {
          operator: linkWrap({
            userID: groupMuteOpUser.userID,
            groupID: msg.groupID,
            name: getName(groupMuteOpUser),
          }),
        });
      case MessageType.GroupCancelMuted:
        const GROUPCANCELMUTEDDetails = JSON.parse(msg.notificationElem!.detail);
        const groupCancelMuteOpUser = GROUPCANCELMUTEDDetails.opUser;
        return t("messageDescription.cancelAllMuteMessage", {
          operator: linkWrap({
            userID: groupCancelMuteOpUser.userID,
            groupID: msg.groupID,
            name: getName(groupCancelMuteOpUser),
          }),
        });
      case MessageType.GroupMemberMuted:
        const gmMutedDetails = JSON.parse(msg.notificationElem!.detail);
        const muteTime = secondsToTime(gmMutedDetails.mutedSeconds);
        return t("messageDescription.singleMuteMessage", {
          operator: linkWrap({
            userID: gmMutedDetails.opUser.userID,
            groupID: msg.groupID,
            name: getName(gmMutedDetails.opUser),
          }),
          name: linkWrap({
            userID: gmMutedDetails.mutedUser.userID,
            groupID: msg.groupID,
            name: getName(gmMutedDetails.mutedUser),
          }),
          muteTime,
        });
      case MessageType.GroupMemberCancelMuted:
        const gmcMutedDetails = JSON.parse(msg.notificationElem!.detail);
        return t("messageDescription.cancelSingleMuteMessage", {
          operator: linkWrap({
            userID: gmcMutedDetails.opUser.userID,
            groupID: msg.groupID,
            name: getName(gmcMutedDetails.opUser),
          }),
          name: linkWrap({
            userID: gmcMutedDetails.mutedUser.userID,
            groupID: msg.groupID,
            name: getName(gmcMutedDetails.mutedUser),
          }),
        });
      // 隐藏修改群公告通知
      // case MessageType.GroupAnnouncementUpdated:
      //   const groupAnnouncementDetails = JSON.parse(msg.notificationElem!.detail);
      //   console.log(msg, "groupAnnouncementDetails");
      //   return t("messageDescription.updateGroupAnnouncementMessage", {
      //     operator: linkWrap({
      //       userID: groupAnnouncementDetails.opUser.userID,
      //       groupID: msg.groupID,
      //       name: getName(groupAnnouncementDetails.opUser),
      //     }),
      //   });
      case MessageType.GroupNameUpdated:
        const groupNameDetails = JSON.parse(msg.notificationElem!.detail);
        return t("messageDescription.updateGroupNameMessage", {
          operator: linkWrap({
            userID: groupNameDetails.opUser.userID,
            groupID: msg.groupID,
            name: getName(groupNameDetails.opUser),
          }),
          name: groupNameDetails.group.groupName,
        });
      case MessageType.BurnMessageChange:
        const burnDetails = JSON.parse(msg.notificationElem!.detail);
        return t("messageDescription.burnReadStatus", {
          status: burnDetails.isPrivate ? t("open") : t("close"),
        });
      case MessageType.OANotification:
        const customNoti = JSON.parse(msg.notificationElem!.detail);
        return customNoti.text;
      default:
        return "";
    }
  } catch (error) {
    return "";
  }
};

export const formatConversionTime = (timestemp: number): string => {
  if (!timestemp) return "";

  const fromNowStr = dayjs(timestemp).fromNow();

  if (fromNowStr.includes(t("date.second"))) {
    return t("date.justNow");
  }

  if (
    !fromNowStr.includes(t("date.second")) &&
    !fromNowStr.includes(t("date.minute"))
  ) {
    return dayjs(timestemp).calendar();
  }

  return fromNowStr;
};

export const formatMessageTime = (timestemp: number, keepSameYear = false): string => {
  if (!timestemp) return "";

  const isRecent = dayjs().diff(timestemp, "day") < 7;
  const keepYear = keepSameYear || !isThisYear(timestemp);

  if (!isRecent && !keepYear) {
    return dayjs(timestemp).format("M/D HH:mm");
  }

  return dayjs(timestemp).calendar();
};

export const parseBr = (text: string) => {
  return text
    .replace(new RegExp("\\n", "g"), "<br>")
    .replace(new RegExp("\n", "g"), "<br>");
};

export const formatMessageByType = (message?: MessageItem, toNofice?: boolean): string => {
  if (!message) return "";
  const selfUserID = useUserStore.getState().selfInfo.userID;
  const isSelf = (id: string) => (id === selfUserID && !toNofice);
  const getName = (user: PublicUserItem) => {
    return (user.userID === selfUserID && !toNofice) ? t('you') : user.nickname;
  };
  try {
    switch (message.contentType) {
      case MessageType.TextMessage:
        return message.textElem!.content;
      case MessageType.AtTextMessage:
        let mstr = message.atTextElem!.text;
        const pattern = /@\S+\s/g;
        const arr = mstr.match(pattern);
        arr?.map((a) => {
          const member = (message.atTextElem!.atUsersInfo ?? []).find(
            (gm) => gm.atUserID === a.slice(1, -1),
          );
          if (member) {
            const reg = new RegExp(a, "g");
            mstr = mstr.replace(reg, `@${member.groupNickname} `);
          }
        });

        return mstr;
      case MessageType.PictureMessage:
        return t("messageDescription.imageMessage");
      case MessageType.VideoMessage:
        return t("messageDescription.videoMessage");
      case MessageType.VoiceMessage:
        return t("messageDescription.voiceMessage");
      case MessageType.LocationMessage:
        const locationInfo = JSON.parse(message.locationElem!.description);
        return t("messageDescription.locationMessage", { location: locationInfo.name });
      case MessageType.CardMessage:
        return t("messageDescription.cardMessage");
      case MessageType.MergeMessage:
        return t("messageDescription.mergeMessage");
      case MessageType.FileMessage:
        return t("messageDescription.fileMessage", {
          file: message.fileElem!.fileName,
        });
      case MessageType.RevokeMessage:
        const data = JSON.parse(message.notificationElem!.detail);
        const operator = isSelf(data.revokerID) ? t("you") : data.revokerNickname;
        const revoker = isSelf(data.sourceMessageSendID)
          ? t("you")
          : data.sourceMessageSenderNickname;

        const isAdminRevoke = data.revokerID !== data.sourceMessageSendID;

        // 检查是否是群组消息的管理员撤回
        if (isAdminRevoke) {
          // 根据 revokerRole 确定是管理员还是群主
          const roleText =
            data.revokerRole === 2
              ? t("placeholder.groupOwner")
              : data.revokerRole === 1
                ? t("placeholder.administrator")
                : "";

          const displayOperator = roleText ? `${operator}(${roleText})` : operator;

          return t("messageDescription.advanceRevokeMessage", {
            operator: displayOperator,
            revoker,
          });
        }
        return t("messageDescription.revokeMessage", { revoker });
      case MessageType.CustomMessage:
        const customData = JSON.parse(message.customElem!.data);
        if (customData.customType === 10086) {
          return `[${t('placeholder.transfer')}]`;
        } else if (customData.customType === 1001) {
          return `[${t('redPacket.redPacket')}]`;
        } else if (customData.customType === 1002) {
          return `[${t('placeholder.RedPacketReceivedNotice')}]`;
        } else if (customData.customType === 401) {
          return t("messageDescription.cardMessage");
        } else if (customData.customType === CustomType.CallRecord) {
          const { type, state, duration } = customData.data;
          const isVideo = type === 'video';
          const callType = isVideo ? t('placeholder.videoCall') : t('placeholder.voiceCall');
          
          // 根据状态返回不同的消息描述
          switch (state) {
            case 'hangup':
              return duration > 0 
                ? `[${callType}] ${t('calls.duration')} ${formatDuration(duration)}`
                : `[${callType}] ${t('calls.canceled')}`;
            case 'reject':
              return `[${callType}] ${t('calls.rejected')}`;
            case 'cancel':
              return `[${callType}] ${t('calls.canceled')}`;
            case 'timeout':
              return `[${callType}] ${t('calls.timeout')}`;
            case 'busy':
              return `[${callType}] ${t('calls.busy')}`;
            case 'networkError':
              return `[${callType}] ${t('calls.networkError')}`;
            default:
              return `[${callType}]`;
          }
        } else if (customData.customType === 2005) {
          return ''; // 不显示 2005 类型的消息
        }
        return t("messageDescription.customMessage");
      case MessageType.QuoteMessage:
        return `[${t('placeholder.ReplyMessage')}]`;
      case MessageType.FaceMessage:
        return t("messageDescription.faceMessage");
      case MessageType.FriendAdded:
        return t("messageDescription.alreadyFriendMessage");
      case MessageType.MemberEnter:
        const enterDetails = JSON.parse(message.notificationElem!.detail);
        const enterUser = enterDetails.entrantUser;
        return t("messageDescription.joinGroupMessage", {
          name: getName(enterUser),
        });
        
      case MessageType.GroupCreated:
        const groupCreatedDetail = JSON.parse(message.notificationElem!.detail);
        const groupCreatedUser = groupCreatedDetail.opUser;
        return t("messageDescription.createGroupMessage", {
          creator: getName(groupCreatedUser),
        });
      case MessageType.MemberInvited:
        const inviteDetails = JSON.parse(message.notificationElem!.detail);
        const inviteOpUser = inviteDetails.opUser;
        const invitedUserList = inviteDetails.invitedUserList ?? [];
        let inviteStr = "";
        invitedUserList
          .slice(0, 3)
          .map((user: any) => (inviteStr += `${getName(user)}、`));
        inviteStr = inviteStr.slice(0, -1);
        return t("messageDescription.invitedToGroupMessage", {
          operator: getName(inviteOpUser),
          invitedUser: `${inviteStr}${invitedUserList.length > 3
              ? `${t("placeholder.and")}${t("placeholder.somePerson", {
                num: invitedUserList.length,
              })}`
              : ""
            }`,
        });
      case MessageType.MemberKicked:
        const kickDetails = JSON.parse(message.notificationElem!.detail);
        const kickOpUser = kickDetails.opUser;
        const kickdUserList = kickDetails.kickedUserList ?? [];
        let kickStr = "";
        kickdUserList.slice(0, 3).map((user: any) => (kickStr += `${getName(user)}、`));
        kickStr = kickStr.slice(0, -1);
        return t("messageDescription.kickInGroupMessage", {
          operator: getName(kickOpUser),
          kickedUser: `${kickStr}${kickdUserList.length > 3
              ? `${t("placeholder.and")}${t("placeholder.somePerson", {
                num: kickdUserList.length,
              })}`
              : ""
            }`,
        });
      case MessageType.MemberQuit:
        const quitDetails = JSON.parse(message.notificationElem!.detail);
        const quitUser = quitDetails.quitUser;
        return t("messageDescription.quitGroupMessage", {
          name: getName(quitUser),
        });
      case MessageType.GroupInfoUpdated:
        const groupUpdateDetail = JSON.parse(message.notificationElem!.detail);
        const groupUpdateUser = groupUpdateDetail.opUser;
        return t("messageDescription.updateGroupInfoMessage", {
          operator: getName(groupUpdateUser),
        });
      case MessageType.GroupOwnerTransferred:
        const transferDetails = JSON.parse(message.notificationElem!.detail);
        const transferOpUser = transferDetails.opUser;
        const newOwner = transferDetails.newGroupOwner;
        return t("messageDescription.transferGroupMessage", {
          owner: getName(transferOpUser),
          newOwner: getName(newOwner),
        });
      case MessageType.GroupDismissed:
        const dismissDetails = JSON.parse(message.notificationElem!.detail);
        const dismissUser = dismissDetails.opUser;
        return t("messageDescription.disbanedGroupMessage", {
          operator: getName(dismissUser),
        });
      case MessageType.GroupMuted:
        const GROUPMUTEDDetails = JSON.parse(message.notificationElem!.detail);
        const groupMuteOpUser = GROUPMUTEDDetails.opUser;
        return t("messageDescription.allMuteMessage", {
          operator: getName(groupMuteOpUser),
        });
      case MessageType.GroupCancelMuted:
        const GROUPCANCELMUTEDDetails = JSON.parse(message.notificationElem!.detail);
        const groupCancelMuteOpUser = GROUPCANCELMUTEDDetails.opUser;
        return t("messageDescription.cancelAllMuteMessage", {
          operator: getName(groupCancelMuteOpUser),
        });
      case MessageType.GroupMemberMuted:
        const gmMutedDetails = JSON.parse(message.notificationElem!.detail);
        const muteTime = secondsToTime(gmMutedDetails.mutedSeconds);
        return t("messageDescription.singleMuteMessage", {
          operator: getName(gmMutedDetails.opUser),
          name: getName(gmMutedDetails.mutedUser),
          muteTime,
        });
      case MessageType.GroupMemberCancelMuted:
        const gmcMutedDetails = JSON.parse(message.notificationElem!.detail);
        return t("messageDescription.cancelSingleMuteMessage", {
          operator: getName(gmcMutedDetails.opUser),
          name: getName(gmcMutedDetails.mutedUser),
        });
      case MessageType.GroupAnnouncementUpdated:
        const groupAnnouncementDetails = JSON.parse(message.notificationElem!.detail);
        return `
            ${t("messageDescription.updateGroupAnnouncementMessage", {
          operator: getName(groupAnnouncementDetails.opUser),
        })}
        `;
      case MessageType.GroupNameUpdated:
        const groupNameDetails = JSON.parse(message.notificationElem!.detail);
        return t("messageDescription.updateGroupNameMessage", {
          operator: getName(groupNameDetails.opUser),
          name: groupNameDetails.group.groupName,
        });
      case MessageType.OANotification:
        const customNoti = JSON.parse(message.notificationElem!.detail);
        return customNoti.text;
      case MessageType.BurnMessageChange:
        const burnDetails = JSON.parse(message.notificationElem!.detail);
        return t("messageDescription.burnReadStatus", {
          status: burnDetails.isPrivate ? t("open") : t("close"),
        });
      default:
        return "";
    }
  } catch (error) {
    return "";
  }
};

export const initStore = () => {
  calcApplicationBadge();
  const { getSelfInfoByReq } = useUserStore.getState();
  const {
    getBlackListByReq,
    getRecvFriendApplicationListByReq,
    getRecvGroupApplicationListByReq,
    getSendFriendApplicationListByReq,
    getSendGroupApplicationListByReq,
  } = useContactStore.getState();
  const { getConversationListByReq, getUnReadCountByReq } =
    useConversationStore.getState();

  getUnReadCountByReq();
  getConversationListByReq();
  getSelfInfoByReq();
  getBlackListByReq();
  getRecvFriendApplicationListByReq();
  getRecvGroupApplicationListByReq();
  getSendFriendApplicationListByReq();
  getSendGroupApplicationListByReq();
  getUnReadCountByReq();
};

export const conversationSort = (
  conversationList: ConversationItem[],
  originalList?: ConversationItem[],
) => {
  const listWithIndex = conversationList.map((item, index) => ({
    ...item,
    originalIndex:
      originalList?.findIndex((c) => c.conversationID === item.conversationID) ?? index,
  }));

  const arr: string[] = [];
  const filterArr = listWithIndex.filter((c) => {
    if (!arr.includes(c.conversationID)) {
      arr.push(c.conversationID);
      return true;
    }
    return false;
  });

  filterArr.sort((a, b) => {
    if (a.isPinned === b.isPinned) {
      const aCompare =
        a.draftTextTime > a.latestMsgSendTime ? a.draftTextTime : a.latestMsgSendTime;
      const bCompare =
        b.draftTextTime > b.latestMsgSendTime ? b.draftTextTime : b.latestMsgSendTime;
      if (aCompare > bCompare) {
        return -1;
      } else if (aCompare < bCompare) {
        return 1;
      } else {
        if (!originalList) return 0;
        return a.originalIndex - b.originalIndex;
      }
    } else if (a.isPinned && !b.isPinned) {
      return -1;
    } else {
      return 1;
    }
  });

  return filterArr.map(({ originalIndex, ...rest }) => rest);
};

export const isGroupSession = (sessionType?: SessionType) =>
  sessionType ? GroupSessionTypes.includes(sessionType) : false;

const regex =
  /\b(https?:\/\/|www\.)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(:\d+)?(\.[a-zA-Z]{2,})?(\/[a-zA-Z0-9\/_.-]*(%[a-fA-F0-9]{2})*(\/[a-zA-Z0-9\/_.-]*)*(\?\S*)?(#\S*)?)?(?=([^a-zA-Z0-9\/_.-]|$))/g;

export const formatLink = (content: string) =>
  content.replace(regex, (match) => {
    let href = match;
    if (!match.match(/^https?:\/\//)) {
      href = "https://" + match;
    }
    return `<a href="${href}" target="_blank" class="link-el">${match}</a>`;
  });

export const calcApplicationBadge = async () => {
  const accessedFriendApplications = (await getAccessedFriendApplication()) ?? [];
  const unHandleFriendApplicationNum = useContactStore
    .getState()
    .recvFriendApplicationList.filter(
      (application) =>
        application.handleResult === 0 &&
        !accessedFriendApplications.includes(
          `${application.fromUserID}_${application.createTime}`,
        ),
    ).length;

  const accessedGroupApplications = (await getAccessedGroupApplication()) ?? [];
  const unHandleGroupApplicationNum = useContactStore
    .getState()
    .recvGroupApplicationList.filter(
      (application) =>
        application.handleResult === 0 &&
        !accessedGroupApplications.includes(
          `${application.userID}_${application.reqTime}`,
        ),
    ).length;
  useContactStore
    .getState()
    .updateUnHandleFriendApplicationCount(unHandleFriendApplicationNum);
  useContactStore
    .getState()
    .updateUnHandleGroupApplicationCount(unHandleGroupApplicationNum);
};

export const checkNotificationPermission = () => {
  if (window.Notification && window.Notification.permission === "default") {
    Notification.requestPermission();
  }
};

export const createNotification = ({
  message,
  conversation,
  callback,
}: {
  message: MessageItem;
  conversation: ConversationItem;
  callback: (conversation: ConversationItem) => void;
}) => {
  if (!window.Notification || window.Notification.permission !== "granted") return;
  let notificationIcon = conversation.faceURL || generateAvatar(conversation.showName);
  if (
    !conversation.faceURL &&
    conversation.conversationType === SessionType.WorkingGroup
  ) {
    notificationIcon = default_group;
  }
  const notification = new Notification(conversation.showName, {
    dir: "auto",
    tag: uuidv4(),
    renotify: true,
    icon: notificationIcon,
    body: getConversationContent(message, conversation),
  });
  notification.onclick = () => {
    callback(conversation);
    window.focus();
    setTimeout(() => window.electronAPI?.ipcInvoke("showMainWindow"));
    notification.close();
  };
};

export const getConversationContent = (message: MessageItem, conversation: ConversationItem, toNofice?: boolean) => {

  if (
    !message.groupID
    || SystemMessageTypes.includes(message.contentType)
    || (message.sendID === useUserStore.getState().selfInfo.userID && !toNofice)
  ) {
    return formatMessageByType(message, toNofice);
  }
  // 检查是否是@消息并处理前缀
  let prefix = "";
  switch (conversation.groupAtType) {
    case GroupAtType.AtAll:
      prefix = `<span style="color: #0081cc">[@${t('placeholder.all')}]</span> `;
      break;
    case GroupAtType.AtMe:
      prefix = `<span style="color: #0081cc">[${t('placeholder.SomeoneMentionedYou')}]</span> `;
      break;
    case GroupAtType.AtGroupNotice:
      prefix = `<span style="color: #0081cc">[${t('placeholder.GroupAnnouncement')}]</span> `;
      break;
    default:
      break;
  }

  return `${prefix}${message.senderNickname}：${formatMessageByType(message, toNofice)}`;
};

export const uploadFile = async (file: FileWithPath, path?: string) => {
  const params: UploadFileParams = {
    name: file.name,
    contentType: file.type,
    uuid: uuidV4(),
    cause: "",
  };
  if (window.electronAPI) {
    params.filepath = path ?? file.path;
  } else {
    params.file = file;
  }

  return IMSDK.uploadFile(params);
};
export const encodeFile = async (file: FileWithPath, path?: string) => {
  const params: UploadFileParams = {
    name: file.name,
    contentType: file.type,
    uuid: uuidV4(),
    cause: "",
  };
  if (window.electronAPI) {
    params.filepath = path ?? file.path;
  } else {
    params.file = file;
  }

  return IMSDK.encodeFile(params);
};

export const getConversationIDByMsg = (message: MessageItem) => {
  if (message.sessionType === SessionType.Single) {
    const ids = [message.sendID, message.recvID].sort();
    return `si_${ids[0]}_${ids[1]}`;
  }
  if (message.sessionType === SessionType.Group) {
    return `sg_${message.groupID}`;
  }
  if (message.sessionType === SessionType.Notification) {
    return `sn_${message.sendID}_${message.recvID}`;
  }
  return "";
};

export const acceptTransfer = async (message: MessageItem) => {
  const { sendMessage } = useSendMessage();
  const selfID = useUserStore.getState().selfInfo.userID;
  const { data } = JSON.parse(message.customElem!.data);
  const transferData = {
    customType: 10086, // 设定接收转账消息类型
    data: {
      ...data,
      receiver: selfID,
      status: "completed",
    },
  };

  try {
    const { data: newMessage } = await IMSDK.createCustomMessage({
      data: JSON.stringify(transferData),
      extension: "",
      description: "接收转账消息",
    });

    const recvID = message.sendID;
    sendMessage({ newMessage });

    // 更新原始转账消息的状态
    const updatedMessage = {
      ...message,
      customElem: {
        ...message.customElem,
        data: JSON.stringify(transferData),
      },
    };
    // updateOneMessage(updatedMessage);

  } catch (error) {
    console.error({ msg: t("转账接收失败"), error });
  }
};

// 转账记录本地存储key
const TRANSFER_HISTORY_KEY = "transfer_history";

// 转账记录接口返回类型
interface TransferRecord {
  transaction_id: string;
  receiver_id: string;
  amount: string;
  received_at: string;
  transaction_type: string;
}

interface TransferHistoryResponse {
  total: number;
  records: TransferRecord[];
}

// 获取本地存储的转账记录
export const getLocalTransferHistory = (): TransferRecord[] => {
  const history = localStorage.getItem(TRANSFER_HISTORY_KEY);
  return history ? JSON.parse(history) : [];
};

// 更新本地存储的转账记录
export const updateLocalTransferHistory = (records: TransferRecord[]) => {
  localStorage.setItem(TRANSFER_HISTORY_KEY, JSON.stringify(records));
};

// 检查消息是否已被领取
export const isTransferReceived = (transaction_id: string): boolean => {
  const history = getLocalTransferHistory();
  return history.some((record) => record.transaction_id === transaction_id);
};

// 格式化通话时长
const formatDuration = (seconds: number) => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};
