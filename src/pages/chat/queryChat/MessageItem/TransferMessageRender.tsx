// src/pages/chat/queryChat/MessageItem/TransferMessageRenderer.tsx
import "./transferCard.css";

import { MessageType } from "@openim/wasm-client-sdk";
import { MessageItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { Card, message as antdMessage } from "antd";
import { t } from "i18next";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CheckReceiveTransfer, GetReceiveHistory, ReceiveTransfer } from "@/api/login";
import transIcon from "@/assets/images/chatFooter/transferCard.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import {
  updateOneMessage,
  updateTransferMessage,
} from "@/pages/chat/queryChat/useHistoryMessageList";
import { useUserStore } from "@/store";
import emitter from "@/utils/events";
import {
  getLocalTransferHistory,
  isTransferReceived,
  updateLocalTransferHistory,
} from "@/utils/imCommon";

interface TransferData {
  currency: string;
  total_amount: number;
  expire_time: number;
  belong_to: string;
  status: "pending" | "completed" | "expired";
  transaction_id: string;
  msg_id: string;
  create_time: number;
  creator: string;
  room_id: string;
  sender: string;
  remark?: string;
}

interface TransferResponse {
  data: {
    received: boolean;
    errMsg?: string;
  };
  errCode?: number;
}

const TransferMessageRender: FC<{ message: MessageItem }> = ({ message }) => {
  const { sendMessage } = useSendMessage();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const isFirstRender = useRef(true);

  const { data } = JSON.parse(message.customElem!.data);
  const {
    currency,
    total_amount,
    expire_time,
    belong_to,
    status: initialStatus,
    msg_id: transferId,
    sender,
    creator,
  } = data as TransferData;

  const selfID = useUserStore((state) => state.selfInfo.userID);
  const isExpired = Date.now() > expire_time;
  const isTransferInitMessage = creator === message.sendID;

  const [transferStatus, setTransferStatus] = useState(initialStatus);

  // 在组件挂载和消息更新时检查转账状态
  useEffect(() => {
    const checkTransferStatus = async () => {
      if (isTransferReceived(transferId)) {
        setTransferStatus("completed");
        return;
      }
    };
    checkTransferStatus();
  }, [transferId, message]); // 添加 message 作为依赖项

  // 监听新消息，处理转账状态更新
  useEffect(() => {
    const handleNewMessage = (newMsg: MessageItem) => {
      if (newMsg.contentType === MessageType.CustomMessage) {
        try {
          const customData = JSON.parse(newMsg.customElem!.data);
          if (customData.customType === 10086) {
            const { data: transferData } = customData;
            if (
              transferData.msg_id === transferId &&
              transferData.status === "completed"
            ) {
              setTransferStatus("completed");
            }
          }
        } catch (error) {
          console.error("解析转账消息失败:", error);
        }
      }
    };

    emitter.on("PUSH_NEW_MSG", handleNewMessage);
    return () => {
      emitter.off("PUSH_NEW_MSG", handleNewMessage);
    };
  }, [transferId]);

  // 监听转账状态更新事件
  useEffect(() => {
    const handleTransferStatusUpdate = ({
      transferId: updatedTransferId,
      status,
    }: {
      transferId: string;
      status: string;
    }) => {
      if (updatedTransferId === transferId) {
        setTransferStatus(status as "pending" | "completed" | "expired");
      }
    };

    emitter.on("TRANSFER_STATUS_UPDATED", handleTransferStatusUpdate);
    return () => {
      emitter.off("TRANSFER_STATUS_UPDATED", handleTransferStatusUpdate);
    };
  }, [transferId]);

  const isAccepted = transferStatus === "completed";
  const canReceive = belong_to === selfID && !isAccepted && !isExpired;

  const handleReceiveTransfer = async () => {
    if (!canReceive || isLoading) return;

    setIsLoading(true);
    try {
      const response = (await ReceiveTransfer(transferId)) as TransferResponse;
      if (response.errCode === 0) {
        const transferData = {
          customType: 10086,
          data: {
            ...data,
            status: "completed",
            sender: selfID,
          },
        };

        const { data: newMessage } = await IMSDK.createCustomMessage({
          data: JSON.stringify(transferData),
          extension: "",
          description: "接收转账消息",
        });

        sendMessage({ message: newMessage });
        setTransferStatus("completed");

        // 将当前转账记录追加到本地存储
        const currentHistory = getLocalTransferHistory();
        const newRecord = {
          transaction_id: transferId,
          receiver_id: selfID,
          amount: total_amount.toString(),
          received_at: new Date().toISOString(),
          transaction_type: "transfer",
        };
        updateLocalTransferHistory([...currentHistory, newRecord]);

        antdMessage.success(t('placeholder.TransferReceivedSuccess'));
      }
    } catch (error) {
      if (error.errCode === 10107) {
        antdMessage.warning(t("toast.walletNotOpen"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusText = () => {
    if (transferStatus === "completed") {
      if (isTransferInitMessage) {
        return t("placeholder.transferHasBeenReceived");
      }
      return t("placeholder.transferReceived");
    }
    if (isExpired) {
      return t("placeholder.transferExpired");
    }
    return belong_to === selfID
      ? t("placeholder.otherSendTransfer")
      : t("placeholder.sendTransfer");
  };

  return (
    <div className="transferCard_container">
      <Card
        size="small"
        title={t(`placeholder.transfer`)}
        style={{
          width: 300,
          backgroundColor: "#E05C3E",
          color: "white",
          opacity:
            (isExpired && transferStatus !== "completed") ||
            transferStatus === "completed"
              ? 0.5
              : 1,
          cursor: canReceive ? "pointer" : "default",
        }}
        onClick={handleReceiveTransfer}
        loading={isLoading}
      >
        <div className="transferCard_box">
          <img src={transIcon} alt="" width={26} />
          <div className="transferCard_right">
            <div className="transferCard_right_top">
              <span>{total_amount}</span>
              <span className="transfer_currency">{currency}</span>
            </div>
            <div className="transferCard_right_bottom">
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TransferMessageRender;
