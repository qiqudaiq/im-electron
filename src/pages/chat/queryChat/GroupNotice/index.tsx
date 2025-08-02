import { RightOutlined } from "@ant-design/icons";
import { MessageReceiveOptType, MessageType } from "@openim/wasm-client-sdk";
import { Button, Divider, Drawer, Empty, Input, Spin } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";

import { modal } from "@/AntdGlobalComp";
import OIMAvatar from "@/components/OIMAvatar";
import SettingRow from "@/components/SettingRow";
import { useConversationSettings } from "@/hooks/useConversationSettings";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useUserStore } from "@/store";
import { useContactStore } from "@/store/contact";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";

import styles from "./chat-notice.module.scss";
import { useSendMessage } from "../../queryChat/ChatFooter/useSendMessage";
import emptyAnnouncement from "@/assets/images/empty_announcement.png";
import { formatMessageTime } from "@/utils/imCommon";

export interface GroupNoticeProps {}

const GroupNotice: ForwardRefRenderFunction<OverlayVisibleHandle, GroupNoticeProps> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const { isOwner, isAdmin } = useCurrentMemberRole();
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const selfInfo = useUserStore((state) => state.selfInfo);
  const { sendMessage } = useSendMessage();

  const [notification, setNotification] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [tempNotification, setTempNotification] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // 判断是否有编辑权限
  const hasPermission = isOwner || isAdmin;

  useEffect(() => {
    if (isOverlayOpen && currentGroupInfo) {
      setNotification(currentGroupInfo.notification || "");
      setTempNotification(currentGroupInfo.notification || "");
      setIsEditing(false);
      // 如果群组信息中有notificationUpdateTime字段，使用它
      if (currentGroupInfo.notificationUpdateTime) {
        setLastUpdateTime(currentGroupInfo.notificationUpdateTime);
      } else {
        // 否则使用群组创建时间
        setLastUpdateTime(currentGroupInfo.createTime);
      }
    }
  }, [isOverlayOpen, currentGroupInfo]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handlePublish = async () => {
    if (!currentGroupInfo) return;

    setIsLoading(true);
    try {
      // 设置群公告
      await IMSDK.setGroupInfo({
        groupID: currentGroupInfo.groupID,
        notification: tempNotification,
      });

      setNotification(tempNotification);
      setIsEditing(false);
      // 更新最后修改时间为当前时间
      const updateTime = Date.now();
      setLastUpdateTime(updateTime);

      // // 发送群公告消息
      // try {
      //   const detail = JSON.stringify({
      //     customType: 400,
      //     opUser: {
      //       userID: selfInfo.userID,
      //       nickname: selfInfo.nickname,
      //       faceURL: selfInfo.faceURL,
      //     },
      //     group: currentGroupInfo,
      //     notification: tempNotification,
      //   });

      //   // 创建通知消息
      //   const { data: message } = await IMSDK.createCustomMessage({
      //     data: detail,
      //     description: "",
      //     extension: "",
      //   });

      //   // 发送通知消息
      //   const res = await sendMessage({
      //     message,
      //     groupID: currentGroupInfo.groupID,
      //     recvID: "",
      //   });

      // } catch (error) {
      //   console.error("发送公告更新通知失败", error);
      // }

      feedbackToast({ msg: t("toast.accessSuccess") });
    } catch (error) {
      feedbackToast({ error, msg: t("toast.accessFailed") });
    } finally {
      setIsLoading(false);
    }
  };

  const renderNoticeContent = () => {
    if (!currentGroupInfo) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Spin />
        </div>
      );
    }

    if (!notification) {
      return (
        <Empty
          className="flex h-full flex-col items-center justify-center"
          description={t("placeholder.noGroupAnnouncement")}
          image={emptyAnnouncement}
        />
      );
    }

    // 获取通知信息
    return (
      <div className="p-4">
        <div className={styles["notice-header"]}>
          <OIMAvatar src={selfInfo.faceURL} text={selfInfo.nickname} />
          <div className={styles["notice-info"]}>
            <div className={styles["notice-group-name"]}>{selfInfo.nickname}</div>
            <div className={styles["notice-time"]}>
              {formatMessageTime(lastUpdateTime)}
            </div>
          </div>
        </div>
        <div className={styles["notice-content"]}>{notification}</div>
      </div>
    );
  };

  const renderEditSection = () => {
    return (
      <div className="p-4">
        <Input.TextArea
          value={tempNotification}
          onChange={(e) => setTempNotification(e.target.value)}
          placeholder={
            t("placeholder.pleaseEnter") + t("placeholder.groupAnnouncement")
          }
          autoSize={{ minRows: 6, maxRows: 10 }}
          maxLength={1000}
          bordered={false}
          className={styles["notice-editor"]}
          disabled={isLoading}
        />
        <div className={styles["notice-limit"]}>{tempNotification.length}/1000</div>
      </div>
    );
  };

  return (
    <Drawer
      title={t("placeholder.groupAnnouncement")}
      placement="right"
      rootClassName="chat-drawer"
      destroyOnHidden
      onClose={closeOverlay}
      open={isOverlayOpen}
      maskClassName="opacity-0"
      maskMotion={{
        visible: false,
      }}
      width={450}
      getContainer={"#chat-container"}
      footer={
        hasPermission ? (
          <div className={styles["notice-footer"]}>
            {isEditing ? (
              <Button type="primary" onClick={handlePublish} loading={isLoading}>
                {t("placeholder.publish")}
              </Button>
            ) : (
              <Button type="primary" onClick={handleEditClick}>
                {t("placeholder.edit")}
              </Button>
            )}
          </div>
        ) : (
          <div>
            <Divider>
              <div className="py-3 text-center text-sm text-gray-400">
                {t("placeholder.needManageEdit")}
              </div>
            </Divider>
          </div>
        )
      }
    >
      {isEditing ? renderEditSection() : renderNoticeContent()}
    </Drawer>
  );
};

export default memo(forwardRef(GroupNotice));
