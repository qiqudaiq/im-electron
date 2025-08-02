import { FC, useRef } from "react";

import Twemoji from "@/components/Twemoji";
import { formatBr } from "@/utils/common";
import { formatLink } from "@/utils/imCommon";
import { formatMessageByType } from "@/utils/imCommon";
import { OverlayVisibleHandle } from "@/hooks/useOverlayVisible";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";
import MergeMessageModal from "./MergeMessageModal";

const MergeMessageRender: FC<IMessageItemProps> = ({ message }) => {
  const content = message.mergeElem?.multiMessage;
  const title = message.mergeElem?.title;
  const mergeModalRef = useRef<OverlayVisibleHandle>(null);

  const handleClick = () => {
    mergeModalRef.current?.openOverlay();
  };

  return (
    <>
      <Twemoji dbSelectAll>
        <div
          // style={{ backgroundColor: "red" }}
          className="max-h-28 min-h-20 w-60 cursor-pointer overflow-hidden rounded-md border"
          onClick={handleClick}
        >
          <div className="border-b border-b-gray-200 px-4 py-2 pb-2 text-sm">
            {title}
          </div>

          <div className=" px-4 py-2" style={{ color: "#999" }}>
            {content?.map((item, index) => {
              return (
                <div key={index} style={{ color: "#999" }}>
                  {item.senderNickname}：{formatMessageByType(item)}
                </div>
              );
            })}
          </div>
        </div>
      </Twemoji>
      <MergeMessageModal ref={mergeModalRef} message={message} />
    </>
  );
};

export default MergeMessageRender;
