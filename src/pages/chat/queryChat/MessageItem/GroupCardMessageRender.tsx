import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";

import OIMAvatar from "@/components/OIMAvatar";
import { emit } from "@/utils/events";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";
import { IMSDK } from "@/layout/MainContentWrap";

const CardMessageRenderer: FC<IMessageItemProps> = ({ message }) => {
  const { t } = useTranslation();

  // 🔥 性能优化：缓存JSON解析结果，避免每次渲染都解析
  const cardData = useMemo(() => {
    try {
      return JSON.parse(message.customElem!.data).data;
    } catch (error) {
      console.error("解析群组卡片数据失败:", error);
      return {};
    }
  }, [message.customElem?.data]);

  const handleClick = async () => {
    try {
      // 先获取群组的最新信息
      const { data } = await IMSDK.getSpecifiedGroupsInfo([cardData.groupID]);
      if (data && data.length > 0) {
        // 发送打开群组卡片的事件
        emit("OPEN_GROUP_CARD", data[0]);
      }
    } catch (error) {
      console.error("获取群组信息失败:", error);
    }
  };
  
  return (
    <div className={styles["card-shadow"]} onClick={handleClick}>
      <div className="flex items-center bg-[#e6f3ff] p-4">
        <OIMAvatar src={cardData.groupAvatar} size={36} text={cardData.groupName} />
        <div className="ml-3 truncate" title={cardData.groupName}>
          {cardData.groupName}
        </div>
      </div>
      <div className="py-1.5 pl-4 text-xs text-[var(--sub-text)]">
        {t("placeholder.groupCard")}
      </div>
    </div>
  );
};

export default CardMessageRenderer;
