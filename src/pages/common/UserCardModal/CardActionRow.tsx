import { SessionType } from "@openim/wasm-client-sdk";
import { FriendUserItem, SelfUserInfo } from "@openim/wasm-client-sdk/lib/types/entity";
import { Space, Tooltip } from "antd";
import { t } from "i18next";
import { memo } from "react";
import { useNavigate } from "react-router-dom";

import { modal } from "@/AntdGlobalComp";
import cancel from "@/assets/images/common/cancel.png";
import card from "@/assets/images/common/card.png";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { emit } from "@/utils/events";
import { useUserStore } from "@/store";

const CardActionRow = ({
  isFriend,
  cardInfo,
  closeOverlay,
}: {
  isFriend?: boolean;
  cardInfo?: Partial<SelfUserInfo & FriendUserItem>;
  closeOverlay: () => void;
}) => {
  const navigate = useNavigate();
  const selfInfo = useUserStore((state) => state.selfInfo);
  const delConversationByCID = useConversationStore(
    (state) => state.delConversationByCID,
  );
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );

  const shareCard = () => {
    const cardMessageOptions = {
      userID: cardInfo?.userID ?? "",
      nickname: cardInfo?.nickname ?? "",
      faceURL: cardInfo?.faceURL ?? "",
      ex: cardInfo?.ex ?? "",
    };
    emit("OPEN_CHOOSE_MODAL", {
      type: "SHARE_CARD",
      extraData: cardMessageOptions,
    });
    closeOverlay();
  };

  const tryUnfriend = () => {
    modal.confirm({
      title: t("placeholder.unfriend"),
      content: t("toast.confirmUnfriend"),
      onOk: async () => {
        try {
          // 1. 获取会话信息
          const { data: conversation } = await IMSDK.getOneConversation({
            sourceID: cardInfo!.userID!,
            sessionType: SessionType.Single,
          });

          if (conversation) {
            // 2. 删除会话和聊天记录
            await IMSDK.deleteConversationAndDeleteAllMsg(conversation.conversationID);
            
            // 3. 从会话列表中移除
            delConversationByCID(conversation.conversationID);
            
            // 4. 如果当前在该会话中，清空当前会话并跳转
            if (
              conversation.conversationID ===
              useConversationStore.getState().currentConversation?.conversationID
            ) {
              updateCurrentConversation();
              navigate("/chat");
            }
          }

          // 5. 删除好友
          await IMSDK.deleteFriend(cardInfo!.userID!);
          
          // 6. 关闭用户资料卡片
          closeOverlay();
        } catch (error) {
          feedbackToast({ error, msg: t("toast.unfriendFailed") });
        }
      },
    });
  };

  return (
    <div className="flex items-center">
      <Space size={4}>
        {
          selfInfo.permissions?.includes('basic') && <Tooltip title={t("placeholder.share")} placement="bottom">
            <img
              className="cursor-pointer"
              width={18}
              src={card}
              alt=""
              onClick={shareCard}
            />
          </Tooltip>
        }

        {isFriend && (
          <Tooltip title={t("placeholder.unfriend")} placement="bottom">
            <img
              className="cursor-pointer"
              width={18}
              src={cancel}
              alt=""
              onClick={tryUnfriend}
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default memo(CardActionRow);
