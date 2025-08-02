import { CloseOutlined } from "@ant-design/icons";
import { GroupType, MessageType, SessionType } from "@openim/wasm-client-sdk";
import { CardElem, MessageItem } from "@openim/wasm-client-sdk/lib/types/entity";
import {
  CustomMsgParams,
  MergerMsgParams,
} from "@openim/wasm-client-sdk/lib/types/params";
import { Button, Input, Modal, Select, Upload } from "antd";
import clsx from "clsx";
import i18n, { t } from "i18next";
import {
  FC,
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";

import { message } from "@/AntdGlobalComp";
import OIMAvatar from "@/components/OIMAvatar";
import { useConversationToggle } from "@/hooks/useConversationToggle";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { FileWithPath } from "@/pages/chat/queryChat/ChatFooter/SendActionBar/useFileMessage";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import { uploadFile } from "@/utils/imCommon";

import ChooseBox, { ChooseBoxHandle } from "./ChooseBox";
import { CheckListItem } from "./ChooseBox/CheckItem";
import { createOrgGroup } from "@/api/login";
import { useUserStore } from "@/store";

export type ChooseModalType =
  | "CRATE_GROUP"
  | "INVITE_TO_GROUP"
  | "KICK_FORM_GROUP"
  | "TRANSFER_IN_GROUP"
  | "FORWARD_MESSAGE"
  | "SELECT_CARD"
  | "SHARE_CARD"
  | "SELECT_USER"
  | "SELECT_RECEIVER";

export interface SelectUserExtraData {
  notConversation: boolean;
  list: CheckListItem[];
}

export interface ChooseModalState {
  type: ChooseModalType;
  extraData?: unknown;
  onSelect?: (data: any []) => void;
}

interface IChooseModalProps {
  state: ChooseModalState;
}

const titleMap = {
  CRATE_GROUP: t("placeholder.createGroup"),
  INVITE_TO_GROUP: t("placeholder.invitation"),
  KICK_FORM_GROUP: t("placeholder.kickMember"),
  SELECT_RECEIVER: t("placeholder.selectUser"),
  TRANSFER_IN_GROUP: t("placeholder.transferGroup"),
  FORWARD_MESSAGE: t("placeholder.mergeForward"),
  SELECT_CARD: t("placeholder.share"),
  SHARE_CARD: t("placeholder.share"),
  SELECT_USER: t("placeholder.selectUser"),
};

i18n.on("languageChanged", () => {
  titleMap.CRATE_GROUP = t("placeholder.createGroup");
  titleMap.INVITE_TO_GROUP = t("placeholder.invitation");
  titleMap.KICK_FORM_GROUP = t("placeholder.kickMember");
  titleMap.SELECT_RECEIVER = t("placeholder.selectUser");
  titleMap.TRANSFER_IN_GROUP = t("placeholder.transferGroup");
  titleMap.FORWARD_MESSAGE = t("placeholder.mergeForward");
  titleMap.SELECT_CARD = t("placeholder.share");
  titleMap.SHARE_CARD = t("placeholder.share");
  titleMap.SELECT_USER = t("placeholder.selectUser");
});

const showConversationTypes = ["FORWARD_MESSAGE", "SHARE_CARD", "SELECT_CARD"];
const onlyOneTypes = ["TRANSFER_IN_GROUP", "SELECT_CARD", "SELECT_RECEIVER"];
const onlyMemberTypes = ["KICK_FORM_GROUP", "TRANSFER_IN_GROUP", "SELECT_RECEIVER"];

const ChooseModal: ForwardRefRenderFunction<OverlayVisibleHandle, IChooseModalProps> = (
  { state: { type, extraData, onSelect } },
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={isOverlayOpen}
      closable={false}
      width={680}
      onCancel={closeOverlay}
      destroyOnHidden
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      className="no-padding-modal max-w-[80vw]"
      maskTransitionName=""
    >
      <ChooseContact
        isOverlayOpen={isOverlayOpen}
        type={type}
        extraData={extraData}
        closeOverlay={closeOverlay}
        onSelect={onSelect}
      />
    </Modal>
  );
};

export default memo(forwardRef(ChooseModal));

type ChooseContactProps = {
  isOverlayOpen: boolean;
  type: ChooseModalType;
  extraData?: unknown;
  closeOverlay: () => void;
  onSelect?: (data: any[]) => void;
};

export const ChooseContact: FC<ChooseContactProps> = ({
  isOverlayOpen,
  type,
  extraData,
  closeOverlay,
  onSelect,
}) => {
  const chooseBoxRef = useRef<ChooseBoxHandle>(null);
  const [loading, setLoading] = useState(false);
  const [groupBaseInfo, setGroupBaseInfo] = useState({
    groupName: "",
    groupAvatar: "",
    groupType: "normal",
  });

  const selfInfo = useUserStore((state) => state.selfInfo);
  const currentUserID = selfInfo.userID;

  const { sendMessage } = useSendMessage();
  const { toSpecifiedConversation } = useConversationToggle();

  useEffect(() => {
    if (isOverlayOpen && type === "CRATE_GROUP" && extraData) {
      setTimeout(
        () => chooseBoxRef.current?.updatePrevCheckList(extraData as CheckListItem[]),
        100,
      );
    }
    if (isOverlayOpen && type === "SELECT_USER" && extraData) {
      setTimeout(
        () =>
          chooseBoxRef.current?.updatePrevCheckList(
            (extraData as SelectUserExtraData).list,
          ),
        100,
      );
    }
    if (!isOverlayOpen) resetState();
  }, [isOverlayOpen]);

  const confirmChoose = async () => {
    const choosedList = chooseBoxRef.current?.getCheckedList() ?? [];
    if (!choosedList?.length && type !== "SELECT_USER")
      return message.warning(t("toast.selectLeastOne"));

    if (!groupBaseInfo.groupName.trim() && type === "CRATE_GROUP")
      return message.warning(t("toast.inputGroupName"));

    setLoading(true);
    try {
      switch (type) {
        case "CRATE_GROUP":
          // if (!groupBaseInfo.groupType) {
          //   return message.warning(t("toast.selectGroupType"));
          // }
          if (choosedList.length === 1) {
            toSpecifiedConversation({
              sourceID: choosedList[0].userID!,
              sessionType: SessionType.Single,
            });
            break;
          }

          if (groupBaseInfo.groupType === "organization") {
            try {
              const res = await createOrgGroup({
                memberUserIDs: choosedList.map((item) => item.userID!),
                adminUserIDs: [],
                ownerUserID: currentUserID,
                groupInfo: {
                  groupName: groupBaseInfo.groupName,
                  notification: "",
                  introduction: "",
                  faceURL: groupBaseInfo.groupAvatar,
                  groupType: 2,
                },
              });
            } catch (error) {
              console.error(error, "error");
            }
          } else {
            await IMSDK.createGroup({
              groupInfo: {
                groupType: GroupType.WorkingGroup,
                groupName: groupBaseInfo.groupName,
                faceURL: groupBaseInfo.groupAvatar,
              },
              memberUserIDs: choosedList.map((item) => item.userID!),
              adminUserIDs: [],
            });
          }

          break;
        case "INVITE_TO_GROUP":
          await IMSDK.inviteUserToGroup({
            groupID: extraData as string,
            userIDList: choosedList.map((item) => item.userID!),
            reason: "",
          });
          break;
        case "SELECT_RECEIVER":
          onSelect(choosedList)
          break;
        case "KICK_FORM_GROUP":
          await IMSDK.kickGroupMember({
            groupID: extraData as string,
            userIDList: choosedList.map((item) => item.userID!),
            reason: "",
          });
          break;
        case "TRANSFER_IN_GROUP":
          await IMSDK.transferGroupOwner({
            groupID: extraData as string,
            newOwnerUserID: choosedList[0].userID!,
          });
          break;
        case "SELECT_CARD":
          if (choosedList[0].groupID) {
            const groupCardData = {
              customType: 401,
              data: {
                groupID: choosedList[0].groupID,
                groupName: choosedList[0].groupName ?? choosedList[0].showName,
                groupAvatar: choosedList[0].faceURL,
              },
            };
            try {
              const { data: message } = await IMSDK.createCustomMessage({
                data: JSON.stringify({
                  ...groupCardData,
                }),
                extension: "",
                description: "群聊名片消息",
              });
              sendMessage({ message });
            } catch (error) {
              console.error(error, "error");
            }
          } else {
            sendMessage({
              message: (
                await IMSDK.createCardMessage({
                  userID: choosedList[0].userID!,
                  nickname: choosedList[0].nickname ?? choosedList[0].showName,
                  faceURL: choosedList[0].faceURL ?? "",
                  ex: choosedList[0].ex ?? "",
                })
              ).data,
            });
          }
          break;
        case "FORWARD_MESSAGE":
        case "SHARE_CARD":
          choosedList.map(async (item) => {
            const message = await getBatchMessage();
            if (item.groupID && !(await IMSDK.isJoinGroup<boolean>(item.groupID))) {
              return;
            }
            const res = await sendMessage({
              message,
              recvID: item.userID ?? "",
              groupID: item.groupID ?? "",
            });
          });
          message.success(t("toast.sendSuccess"));
          break;
        case "SELECT_USER":
          emit("SELECT_USER", {
            notConversation: (extraData as SelectUserExtraData).notConversation,
            choosedList,
          });
          break;
        default:
          break;
      }
    } catch (error) {
      feedbackToast({ error });
    }
    setLoading(false);
    closeOverlay();
  };

  const getBatchMessage = async () => {
    if ((extraData as MessageItem).contentType === MessageType.MergeMessage) {
      // return (await IMSDK.createForwardMessage(extraData as MessageItem)).data;
      return extraData;
    }

    if ((extraData as MessageItem).clientMsgID) {
      return (await IMSDK.createForwardMessage(extraData as MessageItem)).data;
    }
    return (await IMSDK.createCardMessage(extraData as CardElem)).data;
  };

  const resetState = () => {
    chooseBoxRef.current?.resetState();
    setGroupBaseInfo({
      groupName: "",
      groupAvatar: "",
      groupType: "normal",
    });
  };

  const customUpload = async ({ file }: { file: FileWithPath }) => {
    try {
      const {
        data: { url },
      } = await uploadFile(file);
      setGroupBaseInfo((prev) => ({ ...prev, groupAvatar: url }));
    } catch (error) {
      // feedbackToast({ error: t("toast.updateAvatarFailed") });
    }
  };

  const isCheckInGroup = type === "INVITE_TO_GROUP";
  const notConversation = !showConversationTypes.includes(type);

  return (
    <>
      <div className="flex h-16 items-center justify-between bg-[var(--gap-text)] px-7">
        <div>{titleMap[type]}</div>
        <CloseOutlined
          className="cursor-pointer text-[var(--sub-text)]"
          rev={undefined}
          onClick={closeOverlay}
        />
      </div>
      {type === "CRATE_GROUP" ? (
        <div className="px-6 pt-4">
          <div className="mb-6 flex items-center">
            <div className="min-w-[60px] font-medium">{t("placeholder.groupName")}</div>
            <Input
              placeholder={t("placeholder.pleaseEnter")}
              maxLength={16}
              spellCheck={false}
              value={groupBaseInfo.groupName}
              onChange={(e) =>
                setGroupBaseInfo((state) => ({ ...state, groupName: e.target.value }))
              }
            />
          </div>
          {/*<div className="mb-6 flex items-center">*/}
          {/*  <div className="min-w-[60px] font-medium">{t("placeholder.groupType")}</div>*/}
          {/*  <Select*/}
          {/*    placeholder={t("placeholder.pleaseSelect")}*/}
          {/*    value={groupBaseInfo.groupType}*/}
          {/*    style={{ width: "100%" }}*/}
          {/*    onChange={(e) =>*/}
          {/*      setGroupBaseInfo((state) => ({ ...state, groupType: e }))*/}
          {/*    }*/}
          {/*    options={[*/}
          {/*      { label: t("placeholder.organizationGroup"), value: "organization" },*/}
          {/*      { label: t("placeholder.normalGroup"), value: "normal" },*/}
          {/*    ]}*/}
          {/*  />*/}
          {/*</div>*/}
          <div className="mb-6 flex items-center">
            <div className="min-w-[60px] font-medium">
              {t("placeholder.groupAvatar")}
            </div>
            <div className="flex items-center">
              <OIMAvatar src={groupBaseInfo.groupAvatar} isgroup />
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={customUpload as any}
              >
                <span className="ml-3 cursor-pointer text-xs text-[var(--primary)]">
                  {t("placeholder.clickToModify")}
                </span>
              </Upload>
            </div>
          </div>
          <div className="flex">
            <div className="min-w-[60px] font-medium">
              {t("placeholder.groupMember")}
            </div>
            <ChooseBox
              className={clsx("!m-0 !h-[40vh] flex-1")}
              ref={chooseBoxRef}
              notConversation={notConversation}
            />
          </div>
        </div>
      ) : (
        <ChooseBox
          className="!h-[60vh]"
          ref={chooseBoxRef}
          isCheckInGroup={isCheckInGroup}
          notConversation={
            (extraData as SelectUserExtraData)?.notConversation || notConversation
          }
          showGroupMember={onlyMemberTypes.includes(type)}
          chooseOneOnly={onlyOneTypes.includes(type)}
          checkMemberRole={type === "KICK_FORM_GROUP"}
        />
      )}
      <div className="flex justify-end px-9 py-6">
        <Button
          className="mr-6 border-0 bg-[var(--chat-bubble)] px-6"
          onClick={closeOverlay}
        >
          {t("cancel")}
        </Button>
        <Button
          className="px-6"
          type="primary"
          loading={loading}
          onClick={confirmChoose}
        >
          {t("confirm")}
        </Button>
      </div>
    </>
  );
};
