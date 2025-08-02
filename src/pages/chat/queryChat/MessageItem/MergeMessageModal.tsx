import { CloseOutlined } from "@ant-design/icons";
import { MessageItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { Modal } from "antd";
import { forwardRef, ForwardRefRenderFunction } from "react";

import OIMAvatar from "@/components/OIMAvatar";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { formatMessageByType, formatMessageTime } from "@/utils/imCommon";
import Message1 from "@/pages/chat/queryChat/MessageItem";

interface IMergeMessageModalProps {
  message: MessageItem;
}

export const MergeMessageModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  IMergeMessageModalProps
> = ({ message }, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const content = message.mergeElem?.multiMessage || [];
  const title = message.mergeElem?.title;

  return (
    <Modal
      title={null}
      footer={null}
      closable={false}
      open={isOverlayOpen}
      onCancel={closeOverlay}
      centered
      destroyOnHidden
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      width={640}
      className="no-padding-modal "
      maskTransitionName=""
    >
      <div className="flex h-[520px] max-h-[80vh] flex-col overflow-hidden">
        {/* 头部标题 */}
        <div
          className="flex items-center justify-between border-b border-gray-200 px-5 py-4"
          style={{ background: "#e8eaef" }}
        >
          <div className="text-base font-medium">{title}</div>
          <div
            className="cursor-pointer rounded-full p-1 hover:bg-gray-100"
            onClick={closeOverlay}
          >
            <CloseOutlined className="text-gray-500" />
          </div>
        </div>

        {/* 聊天记录内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {content.map((item, index) => (
            // <div key={index} className="mb-5 flex items-start">
            //   <OIMAvatar
            //     src={item.senderFaceUrl}
            //     text={item.senderNickname}
            //     size={40}
            //   />
            //   <div className="ml-3 flex-1">
            //     <div className="flex items-center">
            //       <span className="text-xs text-gray-400">{item.senderNickname}</span>
            //       <span className="ml-2 text-xs text-gray-400">
            //         {formatMessageTime(item.createTime)}
            //       </span>
            //     </div>

            //   </div>
            // </div>
            <div className="mt-1 break-words text-sm" key={index}>
              <Message1 message={item} isSender={false} disabled={true} />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default forwardRef(MergeMessageModal);
