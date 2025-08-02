import { FC, memo } from "react";
import { IMessageItemProps } from ".";
import Twemoji from "@/components/Twemoji";
import speaker from "@/assets/images/chatHeader/speaker.png";
import { t } from "i18next";

const GroupNoticeRender: FC<IMessageItemProps> = ({ message }) => {
  const res = JSON.parse(message.notificationElem!.detail);

  return (
    <Twemoji dbSelectAll>
      <div
        style={{
          border: "1px solid #eee",
          padding: "10px",
          borderRadius: "6px",
          width: '80%',
          minWidth: 250,
        }}
      >
        <div style={{ paddingBottom: 10 }} className="flex items-center">
          <img width={20} src={speaker} alt="" />
          <span style={{ marginLeft: 6, color: "#0081cc", fontWeight: "bold" }}>
            {t("placeholder.groupAnnouncement")}
          </span>
        </div>
        <div style={{
          overflowWrap: 'break-word',
          wordBreak: 'break-all',
        }}>{res.group.notification}</div>
      </div>
    </Twemoji>
  );
};

export default memo(GroupNoticeRender);
