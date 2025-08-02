import { InfoCircleOutlined } from "@ant-design/icons";
import { SessionType } from "@openim/wasm-client-sdk";
import { useUnmount } from "ahooks";
import { Layout } from "antd";
import { AxiosResponse } from "axios";
import { t } from "i18next";
import { useEffect } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { GetReceiveHistory } from "@/api/login";
import { useConversationStore } from "@/store";
import { updateLocalTransferHistory } from "@/utils/imCommon";

import ChatContent from "./ChatContent";
import ChatFooter from "./ChatFooter";
import ChatHeader from "./ChatHeader";
import useConversationState from "./useConversationState";

interface TransferHistoryResponse {
  errCode: number;
  data: {
    total: number;
    records: Array<{
      transaction_id: string;
      receiver_id: string;
      amount: string;
      received_at: string;
      transaction_type: string;
    }>;
  };
}

export const QueryChat = () => {
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );

  const { getIsCanSendMessage, isBlackUser, currentConversation } =
    useConversationState();

  const isNotificationSession =
    currentConversation?.conversationType === SessionType.Notification;

  useUnmount(() => {
    updateCurrentConversation();
  });

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        const axiosResponse = await GetReceiveHistory();
        const response = axiosResponse as AxiosResponse;
        if (response.errCode === 0 && response.data) {
          updateLocalTransferHistory(response.data.records);
        }
      } catch (error) {
        console.error("获取转账历史记录失败:", error);
      }
    };

    fetchTransferHistory();
  }, []); // 在组件挂载时获取一次转账历史


  const switchFooter = () => {
    if (isNotificationSession) {
      return null;
    }
    if (!getIsCanSendMessage()) {
      let tip = t("toast.notCanSendMessage");
      if (isBlackUser) tip = t("toast.userBlacked");

      return (
        <div className="flex justify-center py-4.5 text-xs text-[var(--sub-text)]">
          <InfoCircleOutlined rev={undefined} />
          <span className="ml-1">{tip}</span>
        </div>
      );
    }

    return (
      <>
        <PanelResizeHandle />
        <Panel
          id="chat-footer"
          order={1}
          defaultSize={25}
          maxSize={60}
          className="min-h-[200px]"
        >
          <ChatFooter />
        </Panel>
      </>
    );
  };

  return (
    <Layout id="chat-container" className="relative overflow-hidden">
      <ChatHeader isBlackUser={isBlackUser} />
      <PanelGroup direction="vertical">
        <Panel id="chat-main" order={0}>
          <ChatContent isNotificationSession={isNotificationSession} />
        </Panel>
        {switchFooter()}
      </PanelGroup>
    </Layout>
  );
};
