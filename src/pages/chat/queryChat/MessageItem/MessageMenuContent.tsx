import {
  GroupMemberRole,
  MessageItem,
  MessageType,
  SessionType,
} from "@openim/wasm-client-sdk";
import i18n, { t } from "i18next";
import { memo, useEffect, useState } from "react";
import { useCopyToClipboard } from "react-use";

import check from "@/assets/images/messageMenu/check.png";
import copy from "@/assets/images/messageMenu/copy.png";
import emoji from "@/assets/images/messageMenu/emoji.png";
import forward from "@/assets/images/messageMenu/forward.png";
import remove from "@/assets/images/messageMenu/remove.png";
import reply from "@/assets/images/messageMenu/reply.png";
import revoke from "@/assets/images/messageMenu/revoke.png";
import save from "@/assets/images/messageMenu/save.png";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers from "@/hooks/useGroupMembers";
import { IMSDK } from "@/layout/MainContentWrap";
import { useForwardStore, useUserStore } from "@/store";
import { useConversationStore } from "@/store";
import { feedbackToast, getResourceUrl } from "@/utils/common";
import emitter, { emit } from "@/utils/events";
import { isGroupSession } from "@/utils/imCommon";
import { getUserCustomEmojis, setUserCustomEmojis } from "@/utils/storage";
import { deleteOneMessage, updateOneMessage } from "../useHistoryMessageList";

const messageMenuList = [
  {
    idx: 0,
    title: t("placeholder.add"),
    icon: emoji,
    hidden: false,
  },
  {
    idx: 1,
    title: t("placeholder.forward"),
    icon: forward,
    hidden: false,
  },
  {
    idx: 2,
    title: t("placeholder.copy"),
    icon: copy,
    hidden: false,
  },
  {
    idx: 3,
    title: t("placeholder.quote"),
    icon: reply,
    hidden: false,
  },
  {
    idx: 4,
    title: t("placeholder.revoke"),
    icon: revoke,
    hidden: false,
  },
  {
    idx: 5,
    title: t("placeholder.delete"),
    icon: remove,
    hidden: false,
  },
  {
    idx: 6,
    title: t("placeholder.check"),
    icon: check,
    hidden: false,
  },
  {
    idx: 7,
    title: t("placeholder.save"),
    icon: save,
    hidden: false,
  },
];

i18n.on("languageChanged", () => {
  messageMenuList[0].title = t("placeholder.add");
  messageMenuList[1].title = t("placeholder.forward");
  messageMenuList[2].title = t("placeholder.copy");
  messageMenuList[3].title = t("placeholder.quote");
  messageMenuList[4].title = t("placeholder.revoke");
  messageMenuList[5].title = t("placeholder.delete");
  messageMenuList[6].title = "多选";
});

const canCopyTypes = [
  MessageType.TextMessage,
  MessageType.AtTextMessage,
  MessageType.QuoteMessage,
  MessageType.PictureMessage,
];

const canDownloadTypes = [
  MessageType.PictureMessage,
  MessageType.VideoMessage,
  MessageType.FileMessage,
];

const canRevokeTypes = [
  MessageType.TextMessage,
  MessageType.AtTextMessage,
  MessageType.QuoteMessage,
  MessageType.VideoMessage,
  MessageType.FileMessage,
  MessageType.PictureMessage,
  MessageType.CardMessage,
  MessageType.LocationMessage,
  MessageType.FaceMessage,
  MessageType.FriendAdded,
];

const canAddPhizTypes = [MessageType.PictureMessage, MessageType.FaceMessage];

const MessageMenuContent = ({
  message,
  conversationID,
  closeMenu,
}: {
  message: MessageItem;
  conversationID: string;
  closeMenu: () => void;
}) => {
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const [_, copyToClipboard] = useCopyToClipboard();
  const { isOwner, isAdmin, currentMemberInGroup } = useCurrentMemberRole();
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const isGroupChat = isGroupSession(message.sessionType);
  const { fetchState, getMemberData } = useGroupMembers();
  const [messageSenderRole, setMessageSenderRole] = useState(GroupMemberRole.Normal);
  const { startSelectionMode } = useForwardStore();

  // 获取消息发送者的角色
  useEffect(() => {
    if (isGroupChat && message.sendID !== selfUserID) {
      // 尝试从当前群组成员列表中查找
      const member = fetchState.groupMemberList.find(
        (m) => m.userID === message.sendID,
      );
      if (member) {
        setMessageSenderRole(member.roleLevel);
      } else if (currentConversation?.groupID) {
        // 如果没有找到，尝试加载群成员
        getMemberData(true);
      }
    }
  }, [
    isGroupChat,
    message.sendID,
    fetchState.groupMemberList.length,
    currentConversation?.groupID,
  ]);

  // 判断当前用户是否可以撤回该消息
  const canRevokeThisMessage = () => {
    // 自己的消息可以撤回
    if (message.sendID === selfUserID) return true;

    // 群聊中的权限判断
    if (isGroupChat) {
      // 群主可以撤回任何人的消息
      if (isOwner) return true;

      // 管理员只能撤回普通成员的消息，不能撤回群主和其他管理员的消息
      if (isAdmin) {
        return messageSenderRole === GroupMemberRole.Normal;
      }
    }

    return false;
  };

  const getCustomEmojiData = () => {
    let sourceData = {
      path: "",
      url: "",
      width: 0,
      height: 0,
    };
    if (message.contentType === MessageType.PictureMessage) {
      sourceData = {
        path: message.pictureElem!.sourcePath,
        url: message.pictureElem!.sourcePicture?.url,
        width: message.pictureElem!.sourcePicture?.width,
        height: message.pictureElem!.sourcePicture?.height,
      };
    }
    if (message.contentType === MessageType.FaceMessage) {
      const faceEl = JSON.parse(message.faceElem!.data);
      sourceData = {
        path: faceEl.path ?? "",
        url: faceEl.url,
        width: faceEl.width,
        height: faceEl.height,
      };
    }
    return sourceData;
  };
  const tryDownload = () => {
    switch (message.contentType) {
      case MessageType.PictureMessage:
        window.open(getResourceUrl(message?.pictureElem?.sourcePicture?.url));
        break;
      case MessageType.VideoMessage:
        window.open(getResourceUrl(message?.videoElem?.videoUrl));
        break;
      case MessageType.FileMessage:
        window.open(getResourceUrl(message?.fileElem?.sourceUrl));
        break;
      default:
        break;
    }
  };

  const copyImageInElectron = async (imagePath) => {
    if (window.electronClipboard) {
      await window.electronClipboard.writeImage(imagePath);
    }
  };
  const copyTarget = async () => {
    if (message.contentType === MessageType.PictureMessage) {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        console.warn("浏览器不支持Clipboard API");
        // return;
      }
      if (message.pictureElem && message.pictureElem.sourcePicture) {

        const imgUrl = getResourceUrl(message?.pictureElem?.sourcePicture.url);

        if (window.electronAPI) {
          // const image = nativeImage.createFromPath(imgUrl); 
          // clipboard.writeImage(image);
          await copyImageInElectron(imgUrl);
          console.log('test_copy copyImageInElectron success');
        } else {
          //     const response = await fetch(imgUrl);
          //       // 转换为 Blob
          //     const blob = await response.blob();

          // // 写入剪贴板
          //     await navigator.clipboard.write([
          //       new ClipboardItem({
          //         [blob.type]: blob
          //       })
          //     ]);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = message?.pictureElem.sourcePicture.width;
          canvas.height = message?.pictureElem.sourcePicture.height;

          const img = new Image();
          img.src = imgUrl;
          img.crossOrigin = 'anonymous'; 
          img.onload = function () {
            console.log('test_copy img onload');
            ctx.drawImage(img, 0, 0);
            console.log('test_copy ctx', ctx);
            canvas.toBlob(async (pngBlob) => {
              console.log('test_copy pngBlob ', pngBlob);
              const item = new window.ClipboardItem({ 'image/png': pngBlob });
              await window.navigator.clipboard.write([item]);
            }, 'image/png');
          };


        }
      }
    } else {
      copyToClipboard(getCopyText().trim());
    }


  }
  const menuClick = (idx: number) => {
    switch (idx) {
      case 0:
        getUserCustomEmojis().then((res) => {
          setUserCustomEmojis([...res, getCustomEmojiData()]);
          feedbackToast({ msg: t("toast.addSuccess") });
        });
        break;
      case 1:
        emit("OPEN_CHOOSE_MODAL", {
          type: "FORWARD_MESSAGE",
          extraData: message,
        });
        break;
      case 2:
        copyTarget()
        feedbackToast({ msg: t("toast.copySuccess") });
        break;
      case 3:
        const setQuote = useConversationStore.getState().setQuoteMessage;
        setQuote(message);
        break;
      case 4:
        tryRevoke();
        break;
      case 5:
        tryRemove();
        break;
      case 6:
        startSelectionMode();
        useForwardStore.getState().toggleMessage(message);
        break;
      case 7:
        tryDownload();
        break;
      default:
        break;
    }
    closeMenu();
  };

  const tryRevoke = async () => {
    try {
      await IMSDK.revokeMessage({ conversationID, clientMsgID: message.clientMsgID });
      updateOneMessage({
        ...message,
        contentType: MessageType.RevokeMessage,
        notificationElem: {
          detail: JSON.stringify({
            clientMsgID: message.clientMsgID,
            revokeTime: Date.now(),
            revokerID: selfUserID,
            revokerNickname: t("you"),
            revokerRole: isOwner ? 2 : isAdmin ? 1 : 0,
            seq: message.seq,
            sessionType: message.sessionType,
            sourceMessageSendID: message.sendID,
            sourceMessageSendTime: message.sendTime,
            sourceMessageSenderNickname: message.senderNickname,
          }),
        },
      });
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const tryRemove = async () => {
    try {
      await IMSDK.deleteMessage({ clientMsgID: message.clientMsgID, conversationID });
      deleteOneMessage(message.clientMsgID);
    } catch (error) {
      feedbackToast({ error });
    }
  };

  const getCopyText = () => {
    const selection = window.getSelection()?.toString();
    return selection || message.textElem?.content || "";
  };

  const isSender = message.sendID === selfUserID;
  const moreThanRevokeLimit = message.sendTime < Date.now() - 2 * 60 * 1000;

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

  return (
    <div className="p-1">
      {messageMenuList.map((menu) => {
        if (menu.idx === 0 && !canAddPhizTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 7 && !canDownloadTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 2 && !canCopyTypes.includes(message.contentType)) {
          return null;
        }

        if (menu.idx === 4) {
          if (!canRevokeTypes.includes(message.contentType)) {
            return null;
          }
          // 根据身份和消息发送者确定是否显示撤回选项
          const canRevoke = canRevokeThisMessage();

          // 如果不是可以撤回的消息，则不显示撤回选项
          if (!canRevoke) return null;

          // 对于自己发送的消息，还要检查时间限制（群主和管理员撤回别人消息没有时间限制）
          if (isSender && !isOwner && !isAdmin && moreThanRevokeLimit) return null;
        }

        // 红包和转账消息不显示多选选项
        if (menu.idx === 6 && isRedPacketOrTransfer()) {
          return null;
        }

        return (
          <div
            className="flex cursor-pointer items-center rounded px-3 py-2 hover:bg-[var(--primary-active)]"
            key={menu.idx}
            onClick={() => menuClick(menu.idx)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <img className="mr-2 h-3.5" width={14} src={menu.icon} alt={menu.title} />
            <div className="text-xs">{menu.title}</div>
          </div>
        );
      })}
    </div>
  );
};

export default memo(MessageMenuContent);
