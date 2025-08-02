import { Spin } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import { FC, memo, useState } from "react";

import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";

const MenuItem: FC<{ title: string; className?: string; onClick: () => void }> = ({
  title,
  className,
  onClick,
}) => (
  <div
    className={clsx(
      "cursor-pointer rounded px-3 py-2 text-xs hover:bg-[var(--primary-active)]",
      className,
    )}
    onClick={onClick}
  >
    {title}
  </div>
);

const ConversationNavMenuContent = memo(
  ({ closeConversationMenu }: { closeConversationMenu: () => void }) => {
    const [loading, setLoading] = useState(false);
    // 🔥 优化：使用已缓存的会话列表，避免重新获取
    const conversationList = useConversationStore((state) => state.conversationList);

    const markConversationAsRead = async () => {
      setLoading(true);
      console.log('test_markConversationAsRead');
      
      try {
        // 🔥 优化：使用现有会话列表，避免getAllConversationList查询
        const unreadConversations = conversationList.filter(
          (conversation) => conversation.unreadCount > 0,
        );
        
        
        if (unreadConversations.length === 0) {
          setLoading(false);
          closeConversationMenu();
          return;
        }

        // 🔥 优化：分批并行处理，避免一次性发送太多请求
        const BATCH_SIZE = 10; // 每批处理10个会话
        const batches = [];
        
        for (let i = 0; i < unreadConversations.length; i += BATCH_SIZE) {
          const batch = unreadConversations.slice(i, i + BATCH_SIZE);
          batches.push(batch);
        }


        // 🔥 优化：批量并行执行，大幅提升速度
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          
          await Promise.all(
            batch.map(async (conversation) => {
              try {
                await IMSDK.markConversationMessageAsRead(conversation.conversationID);
              } catch (error) {
                console.error(`❌ 标记会话 ${conversation.showName} 失败:`, error);
              }
            })
          );
          
          // 🔥 优化：批次间短暂延迟，避免服务器压力过大
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
      } catch (error) {
        console.error("❌ 批量标记失败:", error);
        feedbackToast({ error });
      }
      setLoading(false);
      closeConversationMenu();
    };

    return (
      <Spin spinning={loading}>
        <div className="p-1">
          <MenuItem
            title={t("placeholder.markAsRead")}
            onClick={markConversationAsRead}
          />
        </div>
      </Spin>
    );
  },
);

export default ConversationNavMenuContent;
