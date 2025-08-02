import { MessageItem, SessionType, MessageType } from "@openim/wasm-client-sdk";
import { Popover, PopoverProps, Upload } from "antd";
import { TooltipPlacement } from "antd/es/tooltip";
import clsx from "clsx";
import i18n, { t } from "i18next";
import { UploadRequestOption } from "rc-upload/lib/interface";
import { memo, ReactNode, useCallback, useState } from "react";
import React from "react";
import { v4 as uuidv4 } from "uuid";

import { message as antdMessage } from "@/AntdGlobalComp";
import card from "@/assets/images/chatFooter/card.png";
import emoji from "@/assets/images/chatFooter/emoji.png";
import file from "@/assets/images/chatFooter/file.png";
import image from "@/assets/images/chatFooter/image.png";
import redPacket from "@/assets/images/chatFooter/redpacket.png";
import rtc from "@/assets/images/chatFooter/rtc.png";
import transfer from "@/assets/images/chatFooter/transfer.png";
import video from "@/assets/images/chatFooter/video.png";
import { EmojiData } from "@/components/CKEditor";
import { wasmSDK } from "@/layout/MainContentWrap";
import TransferModal from "@/pages/common/TransferModal";
import { useConversationStore, useUserStore } from "@/store";
import { emit } from "@/utils/events";
import { isGroupSession } from "@/utils/imCommon";

import { SendMessageParams } from "../useSendMessage";
import CallPopContent from "./CallPopContent";
import EmojiPopContent from "./EmojiPopContent";
import TransferContent from "./TransferContent";
const msgTypeList = [
  MessageType.TextMessage,
  MessageType.PictureMessage,
  MessageType.VoiceMessage,
  MessageType.VideoMessage,
  MessageType.FileMessage,
  MessageType.AtTextMessage,
  MessageType.MergeMessage,
  MessageType.CardMessage,
  MessageType.LocationMessage,
  MessageType.CustomMessage,
  MessageType.TypingMessage,
  MessageType.QuoteMessage,
  MessageType.FaceMessage,
  MessageType.FriendAdded,
  MessageType.OANotification,
  MessageType.GroupCreated,
  MessageType.GroupInfoUpdated,
  MessageType.MemberQuit,
  MessageType.GroupOwnerTransferred,
  MessageType.MemberKicked,
  MessageType.MemberInvited,
  MessageType.MemberEnter,
  MessageType.GroupDismissed,
  MessageType.GroupMemberMuted,
  MessageType.GroupMemberCancelMuted,
  MessageType.GroupMuted,
  MessageType.GroupCancelMuted,
  MessageType.GroupAnnouncementUpdated,
  MessageType.GroupNameUpdated,
  MessageType.BurnMessageChange,
  MessageType.RevokeMessage,
];

const sendActionList = [
  {
    title: t("placeholder.emoji"),
    icon: emoji,
    key: "emoji",
    accept: undefined,
    comp: <EmojiPopContent />,
    placement: "topLeft",
  },
  {
    title: t("placeholder.image"),
    icon: image,
    key: "image",
    accept: "image/*",
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.video"),
    icon: video,
    key: "video",
    accept: ".mp4",
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.card"),
    icon: card,
    key: "card",
    accept: undefined,
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.file"),
    icon: file,
    key: "file",
    accept: "*",
    comp: null,
    placement: undefined,
  },
  {
    title: t("placeholder.call"),
    icon: rtc,
    key: "rtc",
    accept: undefined,
    comp: <CallPopContent />,
    placement: "top",
  },
  {
    title: t("placeholder.transfer"),
    icon: transfer,
    key: "transfer",
    accept: undefined,
    comp: null,
    placement: "top",
  },
  {
    title: t("placeholder.redPacket"),
    icon: redPacket,
    key: "redPacket",
    accept: undefined,
    comp: null,
    placement: "top",
  },
];

const needPermissionKey = ["image", "video", "card", "file", "transfer", "redPacket" ]

i18n.on("languageChanged", () => {
  sendActionList[0].title = t("placeholder.emoji");
  sendActionList[1].title = t("placeholder.image");
  sendActionList[2].title = t("placeholder.video");
  sendActionList[3].title = t("placeholder.card");
  sendActionList[4].title = t("placeholder.file");
  sendActionList[5].title = t("placeholder.call");
  sendActionList[6].title = t("placeholder.transfer");
  sendActionList[7].title = t("placeholder.redPacket");
});

const SendActionBar = ({
  sendEmoji,
  sendMessage,
  createFileMessage,
  disabled = false,
}: {
  sendEmoji: (emoji: EmojiData) => void;
  sendMessage: (params: SendMessageParams) => Promise<void>;
  createFileMessage: (file: File) => Promise<MessageItem>;
  disabled?: boolean;
}) => {
  const selfInfo = useUserStore((state) => state.selfInfo);
  const [visibleState, setVisibleState] = useState({
    emoji: false,
    cut: false,
    rtc: false,
  });

  const closeAllPop = useCallback(
    () => setVisibleState({ cut: false, rtc: false, emoji: false }),
    [],
  );

  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  // 判断是否为群聊
  const isGroupSession = currentConversation?.conversationType === SessionType.Group;
  const actionClick = async (key: string) => {
    if (disabled) return;

    if (key === "card") {
      emit("OPEN_CHOOSE_MODAL", {
        type: "SELECT_CARD",
      });
    }

    if (key === "transfer") {
      if (isGroupSession) {
        return;
      }
      emit("OPEN_TRANSFER_MODAL", {});
    }

    if (key === "redPacket") {
      emit("OPEN_RED_PACKET_MODAL", {});
    }
  };

  const fileHandle = async (options: UploadRequestOption) => {
    if (disabled) return;

    const fileEl = options.file as File;
    if (fileEl.size === 0) {
      antdMessage.warning(t("empty.fileContentEmpty"));
      return;
    }
    const message = await createFileMessage(fileEl);
    sendMessage({
      message,
    });
  };

  return (
    <div className="flex items-center px-4.5 pt-2">
      {sendActionList
        .filter((action) => {
          // 过滤掉群组消息中的通话和转账入口
          if (needPermissionKey?.includes(action.key) && !selfInfo.permissions?.includes("basic")) {
            return false;
          }
          if (isGroupSession) {
            return action.key !== "rtc" && action.key !== "transfer";
          }
          return true;
        })
        .map((action) => {
          const popProps: PopoverProps = {
            placement: action.placement as TooltipPlacement,
            content:
              action.comp &&
              React.cloneElement(action.comp as React.ReactElement, {
                sendEmoji,
                closeAllPop,
              }),
            title: null,
            arrow: false,
            trigger: "click",
            // @ts-ignore
            open: action.key ? visibleState[action.key] : false,
            onOpenChange: (visible) => {
              if (disabled) return;
              setVisibleState((state) => {
                const tmpState = { ...state };
                // @ts-ignore
                tmpState[action.key] = visible;
                return tmpState;
              });
            },
          };

          return (
            <ActionWrap
              popProps={popProps}
              key={action.key}
              accept={action.accept}
              fileHandle={fileHandle}
              disabled={disabled}
            >
              <div
                className={clsx("flex cursor-pointer items-center last:mr-0", {
                  "mr-5": !action.accept,
                  "cursor-not-allowed opacity-50": disabled,
                })}
                onClick={() => actionClick(action.key)}
              >
                <img src={action.icon} width={20} alt={action.title} />
              </div>
            </ActionWrap>
          );
        })}
    </div>
  );
};

export default memo(SendActionBar);

const ActionWrap = ({
  accept,
  popProps,
  children,
  fileHandle,
  disabled = false,
}: {
  accept?: string;
  children: ReactNode;
  popProps?: PopoverProps;
  fileHandle: (options: UploadRequestOption) => void;
  disabled?: boolean;
}) => {
  return accept ? (
    <Upload
      showUploadList={false}
      customRequest={fileHandle}
      accept={accept}
      multiple
      className="mr-5 flex"
      disabled={disabled}
    >
      {children}
    </Upload>
  ) : (
    <Popover {...popProps}>{children}</Popover>
  );
};
