// src/utils/redPacketUtils.ts
import { IMSDK } from "@/layout/MainContentWrap";
import { feedbackToast } from "@/utils/common";
import { t } from "i18next";
import { useUserStore } from "@/store";
import { CustomType } from "../constants/im";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";

// 发送红包
export const sendRedPacket = async (recvID: string, amount: number) => {
  const selfID = useUserStore.getState().selfInfo.userID;
  const { sendMessage } = useSendMessage();
  const redPacketData = {
    customType: CustomType.RedPacket,
    data: {
      sender: selfID,
      recvID,
      amount,
      redPacketID: `rp_${Date.now()}`,
      status: "pending",
      createTime: Date.now(),
    },
  };

  try {
    const { data: message } = await IMSDK.createCustomMessage({
      data: JSON.stringify(redPacketData),
      extension: "",
      description: "红包消息",
    });

    // await IMSDK.sendMessage({
    //   recvID,
    //   message,
    //   groupID: "",
    //   isOnlineOnly: false,
    // });

    await sendMessage({ ...message, isOnlineOnly: false })

    feedbackToast({ msg: t("红包发送成功") });
  } catch (error: any) {
    // IMSDK 错误需要在这里处理
    if (error?.errCode) {
      feedbackToast({ msg: t("红包发送失败"), error });
    }
  }
};

// 领取红包
export const claimRedPacket = async (redPacketID: string, senderID: string) => {
  const { sendMessage } = useSendMessage();
  const selfID = useUserStore.getState().selfInfo.userID;
  const claimData = {
    customType: CustomType.RedPacketClaim,
    data: {
      redPacketID,
      receiverID: selfID,
      status: "claimed",
    },
  };

  try {
    const { data: message } = await IMSDK.createCustomMessage({
      data: JSON.stringify(claimData),
      extension: "",
      description: "领取红包",
    });

    // await IMSDK.sendMessage({
    //   recvID: senderID,
    //   message,
    //   groupID: "",
    //   isOnlineOnly: false,
    // });
    await sendMessage({ ...message, isOnlineOnly: false })
    feedbackToast({ msg: t("领取成功") });
  } catch (error: any) {
    // IMSDK 错误需要在这里处理
    if (error?.errCode) {
      feedbackToast({ msg: t("领取失败"), error });
    }
  }
};

export const updateRedPacketStatus = (redPacketID: string, status: string) => {
  // 这里可以根据实际需求更新本地状态或调用后端接口更新状态
};
