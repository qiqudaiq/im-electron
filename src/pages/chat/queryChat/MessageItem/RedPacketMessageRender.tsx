// src/pages/chat/queryChat/MessageItem/TransferMessageRenderer.tsx
import "./transferCard.css";

import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import { MessageItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { Card, message as antdMessage } from "antd";
import { t } from "i18next";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CheckCompleted,
  CheckReceiveTransfer,
  GetReceiveHistory,
  getRedPacketDetail,
  ReceiveTransfer,
} from "@/api/login";
import transIcon from "@/assets/images/chatFooter/transferCard.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import RedPacketDetail from "@/pages/common/RedPacketPop";
import { useConversationStore, useUserStore } from "@/store";
import emitter from "@/utils/events";
import {
  getLocalTransferHistory,
  isTransferReceived,
  updateLocalTransferHistory,
} from "@/utils/imCommon";
import { da } from "date-fns/locale";

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
  mark?: string;
}

interface TransferResponse {
  data: {
    received: boolean;
    errMsg?: string;
    completed: boolean;
  };
  errCode?: number;
}

const RedPacketMessageRender: FC<{ message: MessageItem }> = ({ message }) => {
  const { sendMessage } = useSendMessage();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [redPacketDetail, setRedPacketDetail] = useState<{
    received_amount: string;
    received_count: number;
    records: [];
    total_amount: string;
    total_count: number;
    senderNickname: string;
    youReceive: string;
    youClaimed: boolean;
    extension: any;
  } | null>(null);
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
    remark,
  } = data as TransferData;

  const selfID = useUserStore((state) => state.selfInfo.userID);
  const isExpired = Date.now() > expire_time;
  const isTransferInitMessage = creator === message.sendID;
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const isGroup = currentConversation?.conversationType === SessionType.Group;

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
          if (customData.customType === 1001) {
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

  const formatRecords = async (arr: []) => {
    const newArr = await Promise.all(
      arr.map(async (item: any) => {
        const { data: sendUser } = await IMSDK.getUsersInfo([item.receiver_im_id]);
        return {
          ...item,
          nickName: sendUser[0]?.nickname || item.receiver_id,
        };
      }),
    );
    return newArr;
  };

  const redPacketClick = async () => {
    if (isAccepted) {
      groupClick();
    } else {
      handleReceiveTransfer();
    }
  };
  const handleReceiveTransfer = async () => {
    if (!canReceive || isLoading) return;
    // const response = (await CheckCompleted(transferId)) as TransferResponse;
    setIsLoading(true);
    try {
      const response = (await ReceiveTransfer(transferId)) as TransferResponse;
      if (response.errCode === 0) {
        const transferData = {
          customType: 1001,
          data: {
            ...data,
            status: "completed",
            sender: selfID,
          },
        };

        const { data: newMessage } = await IMSDK.createCustomMessage({
          data: JSON.stringify(transferData),
          extension: "",
          description: "接收红包消息",
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

        antdMessage.success(t('placeholder.RedPacketReceivedSuccess'));
      }
    } catch (error) {
      if (error.errCode === 10107) {
        antdMessage.warning(t("toast.walletNotOpen"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const groupClick = async () => {

    const youClaimed = isTransferReceived(transferId);
    try {
      const response = (await getRedPacketDetail(transferId)) as any;

      // 获取红包发起者昵称
      const { data: users } = await IMSDK.getUsersInfo([sender]);

      const senderNickname = users[0]?.nickname || sender;
      if (response.errCode === 0 && response.data) {
        const { received_amount, received_count, records, total_amount, total_count } =
          response.data;
        const formattedRecords = await formatRecords(records);
        const youReceive =
          formattedRecords.find((item: any) => item.receiver_im_id === selfID)?.amount ||
          "0";
        setRedPacketDetail({
          received_amount,
          received_count,
          records: formattedRecords,
          total_amount,
          total_count,
          senderNickname,
          youReceive,
          youClaimed,
          currency: data.currency,
          extension: data.extension
        });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("获取红包详情失败:", error);
    }
  };

  const groupReceive = async (password: string) => {
    try {      
      // 如果是私聊且是自己发送的红包，则不允许领取
      if (!isGroup && sender === selfID) {
        antdMessage.warning('不能领取自己发送的红包');
        throw new Error('不能领取自己发送的红包');
      }
      
      const response = (await CheckCompleted(transferId)) as TransferResponse;
      if (response.data.completed && !isTransferReceived(transferId)) {
        setTransferStatus("completed");
        const currentHistory = getLocalTransferHistory();
        const newRecord = {
          transaction_id: transferId,
          receiver_id: selfID,
          amount: total_amount.toString(),
          received_at: new Date().toISOString(),
          transaction_type: "transfer",
        };
        updateLocalTransferHistory([...currentHistory, newRecord]);
        antdMessage.warning(t('placeholder.RedPacketGrabbedOut'));

        return;
      }

      // 未领取逻辑
      if (
        response.errCode === 0 &&
        !response.data.received &&
        !response.data.completed
      ) {
        const receiveRes = (await ReceiveTransfer(transferId, password)) as TransferResponse;

        // 获取当前用户昵称
        const selfInfo = useUserStore.getState().selfInfo;
        const selfNickname = selfInfo.nickname;

        // 获取红包发起者昵称
        const { data: users } = await IMSDK.getUsersInfo([sender]);
        const senderNickname = users[0]?.nickname || sender;

        let noticeData: any = {
          customType: 1002,
          content: t('placeholder.RedPacketReceivedContent', {
            selfNickname: selfNickname,
            senderNickname: senderNickname
          }),
          timestamp: Date.now(),
          viewType: 1002,
        };
        if (!isGroup) {
          noticeData = {
            customType: 1001,
            data: {
              ...data,
              status: "completed",
              sender: selfID,
            },
            viewType: 1001,
          };
        }

        const { data: newMessage } = await IMSDK.createCustomMessage({
          data: JSON.stringify(noticeData),
          extension: "",
          description: "接收红包消息",
        });
        sendMessage({ message: newMessage });
        // 将当前转账记录追加到本地存储
        setTransferStatus("completed");

        const currentHistory = getLocalTransferHistory();
        const newRecord = {
          transaction_id: transferId,
          receiver_id: selfID,
          amount: total_amount.toString(),
          received_at: new Date().toISOString(),
          transaction_type: "transfer",
        };
        updateLocalTransferHistory([...currentHistory, newRecord]);

        try {
          const response = (await getRedPacketDetail(transferId)) as any;
          // 获取红包发起者昵称
          const { data: users } = await IMSDK.getUsersInfo([sender]);
          const senderNickname = users[0]?.nickname || sender;
          if (response.errCode === 0 && response.data) {
            const {
              received_amount,
              received_count,
              records,
              total_amount,
              total_count,
            } = response.data;
            const formattedRecords = await formatRecords(records);

            const youReceive =
              formattedRecords.find((item: any) => item.receiver_im_id === selfID)
                ?.amount || "0";

            setRedPacketDetail({
              received_amount,
              received_count,
              records: formattedRecords,
              total_amount,
              total_count,
              senderNickname,
              youReceive,
              currency: data.currency,
              extension: data.extension
            });
            setIsModalOpen(true);
          }
        } catch (error) {
          console.error("获取红包详情失败:", error);
          throw error;
        }
      }
      // 已领取逻辑
      else {
        try {
          const response = (await getRedPacketDetail(transferId)) as any;
          // 获取红包发起者昵称
          const { data: users } = await IMSDK.getUsersInfo([sender]);
          const senderNickname = users[0]?.nickname || sender;
          if (response.errCode === 0 && response.data) {
            const {
              received_amount,
              received_count,
              records,
              total_amount,
              total_count,
            } = response.data;
            const formattedRecords = await formatRecords(records);

            const youReceive =
              formattedRecords.find((item: any) => item.receiver_id === selfID)
                ?.amount || "0";

            setRedPacketDetail({
              received_amount,
              received_count,
              records: formattedRecords,
              total_amount,
              total_count,
              senderNickname,
              youReceive,
              currency: data.currency,
              extension: data.extension
            });
            setIsModalOpen(true);
          }
        } catch (error) {
          console.error("获取红包详情失败:", error);
          throw error;
        }
      }
    } catch (error) {
      console.error("接收红包失败:", error);
      throw error;
    }
  };

  const getStatusText = () => {
    if (transferStatus === "completed") {
      if (isTransferInitMessage) {
        return <>
          {t("redPacket.hasBeenReceived")}
          <p style={{ lineHeight: '16px' }}>{remark}</p>
        </>;
      }
      return <>
        {t("redPacket.received")}
        <p style={{ lineHeight: '16px' }}>{remark}</p>
      </>;
    }
    if (isExpired) {
      return <>
        {t("redPacket.expired")}
        <p style={{ lineHeight: '16px' }}>{remark}</p>
      </>;
    }
    return belong_to === selfID
      ? <>
        {t("redPacket.otherSendRedPacket")}
        <p style={{ lineHeight: '16px' }}>{remark ?? t('placeholder.WishYouWealth')}</p>
      </>
      : <>
        {t("redPacket.sendRedPacket")}
        <p style={{ lineHeight: '16px' }}>{remark ?? t('placeholder.WishYouWealth')}</p>
      </>
  }
  const getRedPacketTitle = () => {
    if (data.extension && data.extension.lucky_money_type === "SPECIAL") {
      return t('placeholder.RedPacketForName', { name: data.extension.special_receiver_name })
    }
    return t(`redPacket.redPacket`)
  }
  return (
    <div className="transferCard_container">
      <Card
        size="small"
        title={getRedPacketTitle()}
        style={{
          width: 200,
          backgroundColor: "#E05C3E",
          color: "white",
          opacity:
            (isExpired && transferStatus !== "completed") ||
              transferStatus === "completed"
              ? 0.5
              : 1,
          cursor: canReceive ? "pointer" : "default",
        }}
        onClick={groupClick}
        loading={isLoading}
      >
        <div className="transferCard_box">
          <img src={transIcon} alt="" width={26} />
          <div className="transferCard_right">
            <div className="transferCard_right_top">
              {isGroup && <span>{remark ?? t('placeholder.WishYouWealth')}</span>}
              {!isGroup && (
                <span>{transferStatus === "completed" ? total_amount : "**"}</span>
              )}
              {!isGroup && <span className="transfer_currency">{currency}</span>}
            </div>
            {!isGroup && (
              <div className="transferCard_right_bottom">
                <>{getStatusText()}</>
              </div>
            )}
          </div>
        </div>
      </Card>
      <RedPacketDetail
        open={isModalOpen}
        close={() => setIsModalOpen(false)}
        detail={redPacketDetail || undefined}
        onReceive={groupReceive}
        status={transferStatus}
      />
    </div>
  );
};

export default RedPacketMessageRender;
