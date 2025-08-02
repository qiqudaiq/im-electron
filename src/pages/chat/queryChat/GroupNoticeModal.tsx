import { CloseCircleOutlined, SearchOutlined } from "@ant-design/icons";
import {
  FriendUserItem,
  GroupItem,
  SearchMessageResultItem,
} from "@openim/wasm-client-sdk/lib/types/entity";
import { useDebounceFn } from "ahooks";
import { Tooltip } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import Twemoji from "@/components/Twemoji";

import styles from "./GroupNotice/chat-notice.module.scss";
import { MessageType } from "@openim/wasm-client-sdk";
import { useConversationStore } from "@/store";
import OIMAvatar from "@/components/OIMAvatar";
import { formatMessageTime } from "@/utils/imCommon";
import speaker from "@/assets/images/chatHeader/speaker.png";

// 获取群组公告上次查看时间
const getGroupNoticeLastViewTime = (groupID: string): number => {
  const key = `group_notice_last_view_${groupID}`;
  const storedTime = localStorage.getItem(key);
  return storedTime ? parseInt(storedTime, 10) : 0;
};

// 更新群组公告查看时间
const updateGroupNoticeLastViewTime = (groupID: string, time: number): void => {
  const key = `group_notice_last_view_${groupID}`;
  localStorage.setItem(key, time.toString());
};

const GroupNoticeModal: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay, openOverlay } = useOverlayVisible(ref);
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [shouldShowNotice, setShouldShowNotice] = useState<boolean>(false);
  const currentGroupIDRef = useRef<string>("");

  const fetchNoticeSender = async () => {
    if (!currentGroupInfo?.notificationUserID) return;
    const { data } = await IMSDK.getUsersInfo([currentGroupInfo.notificationUserID]);
    setUserInfo(data[0]);
  };

  useEffect(() => {
    if (!currentGroupInfo) return;

    // 记录当前群组ID，用于判断是否切换了群组
    const isGroupChanged = currentGroupIDRef.current !== currentGroupInfo.groupID;
    currentGroupIDRef.current = currentGroupInfo.groupID;

    fetchNoticeSender();

    // 检查是否应该显示群公告
    const lastViewTime = getGroupNoticeLastViewTime(currentGroupInfo.groupID);
    const notificationUpdateTime = currentGroupInfo.notificationUpdateTime || 0;

    // 如果公告更新时间大于上次查看时间，则需要显示公告
    const newShouldShowNotice = notificationUpdateTime > lastViewTime;
    setShouldShowNotice(newShouldShowNotice);

    // 如果需要显示公告并且群组发生了变化，则自动打开弹窗
    if (newShouldShowNotice && isGroupChanged) {
      openOverlay();
    }
  }, [currentGroupInfo, openOverlay]);

  const getGroupNotice = (length: number) => {
      if (currentGroupInfo.notification.length > length) {
        return (
          <Tooltip title={currentGroupInfo.notification}>
            <span>{currentGroupInfo.notification.substring(0, length)}</span>
          </Tooltip>
        )
      }
      return (
        <span>{currentGroupInfo.notification}</span>
      )
  }
  // 处理关闭公告的逻辑
  const handleCloseNotice = () => {
    if (currentGroupInfo) {
      // 更新本地存储的查看时间为当前公告的更新时间
      const notificationUpdateTime =
        currentGroupInfo.notificationUpdateTime || Date.now();
      updateGroupNoticeLastViewTime(currentGroupInfo.groupID, notificationUpdateTime);
    }
    closeOverlay();
  };

  if (!currentGroupInfo || !userInfo || !shouldShowNotice) return null;

  return (
    <div
      style={{
        visibility: isOverlayOpen ? "visible" : "hidden",
        top: "10%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        position: "absolute",
        zIndex: 1000,
        background: "white",
      }}
    >
      <div
        style={{
          border: "1px solid #eee",
          padding: "10px",
          borderRadius: "6px",
          minWidth: 250,
        }}
      >
        <div style={{ paddingBottom: 6 }} className="flex items-center">
          <img width={20} src={speaker} alt="" />
          <span style={{ marginLeft: 6, color: "#0081cc", fontWeight: "bold" }}>
            {t("placeholder.groupAnnouncement")}
          </span>
          <span className="flex-1 text-right">
            <CloseCircleOutlined
              className="cursor-pointer rounded-full bg-gray-100 text-gray-400"
              onClick={handleCloseNotice}
            />
          </span>
        </div>
        {
          getGroupNotice(30)
        }
        {/* <div>{currentGroupInfo.notification}</div> */}
        <div style={{ marginTop: 6 }}>
          <OIMAvatar
            size={20}
            src={userInfo?.faceURL}
            text={userInfo?.nickname}
            className="mr-2"
          />
          <span className="text-xs text-gray-400">{userInfo?.nickname}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(forwardRef(GroupNoticeModal));
