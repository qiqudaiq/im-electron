import { FC } from "react";
import { MessageType } from "@openim/wasm-client-sdk";
import Twemoji from "@/components/Twemoji";
import { formatBr } from "@/utils/common";
import { formatLink, formatMessageByType } from "@/utils/imCommon";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";
import { useUserStore } from "@/store/user";

const QuoteMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const content = message.quoteElem?.text || "";
  const quotedMessage = message.quoteElem?.quoteMessage;
  const { selfInfo } = useUserStore();
  const isSelf = message.sendID === selfInfo.userID;

  const formattedContent = formatLink(formatBr(content));

  return (
    <div>
      <div
        className={`flex ${isSelf ? "justify-end" : ""}`}
        style={{ marginBottom: 4 }}
      >
        <Twemoji dbSelectAll>
          <div className={styles.bubble}>
            <div dangerouslySetInnerHTML={{ __html: formattedContent }}></div>
          </div>
        </Twemoji>
      </div>

      <div>
        {quotedMessage && (
          <div className="mb-2 rounded bg-black/5 p-2 text-xs">
            <div className="line-clamp-2 text-[var(--sub-text)] ">
              {quotedMessage.senderNickname}:{" "}
              {quotedMessage.contentType === MessageType.TextMessage &&
                quotedMessage.textElem?.content}
              {quotedMessage.contentType === MessageType.AtTextMessage &&
                quotedMessage.atTextElem?.text}
              {quotedMessage.contentType !== MessageType.TextMessage &&
                quotedMessage.contentType !== MessageType.AtTextMessage &&
                formatMessageByType(quotedMessage)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteMessageRender;
