import { RightOutlined } from "@ant-design/icons";
import { MessageReceiveOptType, MessageType } from "@openim/wasm-client-sdk";
import { Button, Divider, Drawer, Empty, Input, Spin, Tabs } from "antd";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useCallback,
  useEffect,
  useState,
} from "react";

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

import styles from "@/pages/common/GlobalSearchModal/index.module.scss";

import { useSendMessage } from "../../queryChat/ChatFooter/useSendMessage";
import emptyAnnouncement from "@/assets/images/empty_announcement.png";
import ChatHistoryPanel from "./ChatHistoryPanel";
import ImageHistoryPanel from "./ImageHistoryPanel";
import VideoHistoryPanel from "./VideoHistoryPanel";
import FileHistoryPanel from "./FileHistoryPanel";
export interface GroupNoticeProps {}
const TabKeys = ["Message", "picture", "video", "file"] as const;

export type TabKey = (typeof TabKeys)[number];

const SearchHistory: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  GroupNoticeProps
> = (_, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const [activeKey, setActiveKey] = useState<TabKey>("Message");

  const formatDateTime = (timestamp?: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const items = [
    {
      key: "Message",
      label: t("placeholder.chat"),
      children: <ChatHistoryPanel closeOverlay={closeOverlay} />,
    },
    {
      key: "picture",
      label: t("placeholder.image"),
      children: <ImageHistoryPanel />,
    },
    {
      key: "video",
      label: t("placeholder.video"),
      children: <VideoHistoryPanel />,
    },
    {
      key: "file",
      label: t("placeholder.file"),
      children: <FileHistoryPanel />,
    },
  ];

  const toggleTab = useCallback((tab: TabKey) => {
    setActiveKey(tab);
  }, []);

  return (
    <Drawer
      title={t("placeholder.historyList")}
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
    >
      <Tabs
        className={styles["search-tab"]}
        defaultActiveKey="Message"
        activeKey={activeKey}
        items={items}
        style={{ paddingLeft: 20 }}
        onChange={toggleTab as (key: string) => void}
      />
    </Drawer>
  );
};

export default memo(forwardRef(SearchHistory));
