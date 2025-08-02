import "./style.css";

import { Avatar, List, Modal } from "antd";
import dayjs from "dayjs";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import OIMAvatar from "@/components/OIMAvatar";
import { IMSDK } from "@/layout/MainContentWrap";
import { isTransferReceived } from "@/utils/imCommon";

import RedPacketCover from "./RedPacketCover";

interface RedPacketRecord {
  receiver_id: string;
  received_at: string;
  amount: string;
  nickName: string;
  faceURL: string;
}

interface RedPacketDetailProps {
  open: boolean;
  close: () => void;
  detail?: {
    received_amount: string;
    received_count: number;
    records: RedPacketRecord[];
    total_amount: string;
    total_count: number;
    senderNickname: string;
    youReceive: string;
    youClaimed: boolean;
    currency: string;
    extension: any;
  };
  isReceived?: boolean;
  mark?: string;
  onReceive?: (password: string) => void;
  status?: string;
}

const RedPacketDetail: FC<RedPacketDetailProps> = ({
  open,
  close,
  detail = {
    received_amount: "0",
    received_count: 0,
    records: [],
    total_amount: "0",
    total_count: 0,
    senderNickname: "",
    youReceive: "0",
    youClaimed: false,
    currency: "",
    extension: {},
  },
  mark,
  onReceive,
  status,
}) => {
  const { t } = useTranslation();
  const [isOpened, setIsOpened] = useState(status === "completed");

  if (!detail) return null;

  const Claimed = detail.youClaimed;
  const over =
    detail.total_count === detail.received_count && detail.youReceive === "0";

  const handleOpen = async (password: string) => {
    
    
    if (onReceive) {
      try {
        await onReceive(password);
        setIsOpened(true);
      } catch (error) {
        console.error('handleOpen error', error);
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      centered
      className="redPacket-modal"
      width={320}
    >
      <div className="redPacket-container">
        {!Claimed && (
          <RedPacketCover
            senderName={detail.senderNickname}
            type={detail.extension.lucky_money_type}
            receiverName={detail.extension.lucky_money_type === "SPECIAL" && detail.extension.special_receiver_name}
            receiverId={detail.extension.lucky_money_type === "SPECIAL" && detail.extension.special_receiver_id}
            mark={mark}
            onOpen={handleOpen}
            isOpened={isOpened}
          />
        )}
        <div className="redPacket-content">
          <div className="amount-container">
            {detail.youReceive !== "0" && <span className="amount">{detail.youReceive}</span>}
            <span className="currency">{detail.currency}</span>
          </div>
          <div className="status-text">
            {!over ? t('placeholder.DepositedToWallet') : t('placeholder.RedPacketRunOut')}
          </div>
        </div>
        <div className="redPacket-footer">
          <div className="gap"></div>
          <div className="title">
            {t('placeholder.RedPacketReceived', { count: `${detail.received_count} / ${detail.total_count}`, amount: `${detail.received_amount} / ${detail.total_amount} ` })}
            {detail.currency}
          </div>
          <div className="list">
            <List
              itemLayout="horizontal"
              dataSource={detail.records}
              size="small"
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<OIMAvatar src={item.faceURL} text={item.nickName} />}
                    title={<div>{item.nickName}</div>}
                    description={
                      <span style={{ fontSize: 12 }}>
                        {dayjs(item.received_at).format("MM-DD HH:mm")}
                      </span>
                    }
                  />
                  <div>
                    {item.amount} {detail.currency}
                  </div>
                </List.Item>
              )}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default RedPacketDetail;
