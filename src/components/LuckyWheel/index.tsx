import React, { useRef, useEffect, useState } from "react";
import { Modal, message, Spin } from "antd";
import { t } from "i18next";
import { CloseOutlined } from "@ant-design/icons";
import styles from "./index.module.scss";
import WheelContent from "./WheelContent";
import { Prize } from "./types";

interface LuckyWheelProps {
  visible: boolean;
  lottery_ticket_id:string;
  id:string;
  onClose: () => void;
}

const LuckyWheel: React.FC<LuckyWheelProps> = ({ visible, onClose,id,lottery_ticket_id }) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SPIN_COMPLETE") {
        const { prize } = event.data.data;
        Modal.success({
          title: t("placeholder.congratulations"),
          content: t("placeholder.prizeWon", { prize: prize.option }),
          okText: t("confirm"),
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleComplete = (prize: Prize) => {
    const result = {
      type: "SPIN_COMPLETE",
      data: { prize },
    };
  };

  return (
    <>
     <Modal
      open={visible}
      onCancel={onClose}
      centered
      footer={null}
      closable={false}
      maskClosable={false}
      className={styles.luckyWheelModal}
      destroyOnHidden
    >
      <div className={styles.wheelWrapper}>
        <button className={styles.closeButton} onClick={onClose}>
          <CloseOutlined />
        </button>

        <WheelContent onComplete={handleComplete} id={id}lottery_ticket_id={lottery_ticket_id} onClose={()=>{}}/>
      </div>
    </Modal>
    </>
   
  );
};

export default LuckyWheel;
