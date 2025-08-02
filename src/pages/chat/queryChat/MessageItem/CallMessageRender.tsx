import { MessageType } from "@openim/wasm-client-sdk";
import clsx from "clsx";
import { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";

import call_audio from "@/assets/images/chatFooter/call_audio.png";
import call_video from "@/assets/images/chatFooter/call_video.png";
import { useUserStore } from "@/store";
// 格式化通话时长
const formatDuration = (seconds: number) => {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

enum CallState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  HANGUP = "hangup",
  CANCEL = "cancel",
  REJECT = "reject",
  BEREJECTED = "beRejected",
  TIMEOUT = "timeout",
  BUSY = "busy",
  NETWORK_ERROR = "networkError"
}

const CallMessageRender: FC<IMessageItemProps> = ({ message, isSender }) => {
  const { t } = useTranslation();
  
  // 🔥 性能优化：缓存JSON解析结果，避免每次渲染都解析
  const callData = useMemo(() => {
    try {
      const customData = JSON.parse(message.customElem!.data);
      return customData.data;
    } catch (error) {
      console.error("解析通话数据失败:", error);
      return { type: 'audio', state: CallState.CANCEL, duration: 0, from: '' };
    }
  }, [message.customElem?.data]);

  const { type, state, duration, from } = callData;
  const isVideo = type === 'video';
  const selfUserID = useUserStore.getState().selfInfo.userID;
  const isInviter = from === message.sendID;

  // 获取状态文本
  const getStateText = () => {
    switch (state) {
      case CallState.HANGUP:
        return duration > 0 ? t('calls.duration') + ' ' + formatDuration(duration) : t('calls.canceled');
      case CallState.REJECT:
          return t('calls.selfRejected'); // 已拒绝
      case CallState.BEREJECTED:
        return t('calls.selfRejected'); // 已拒绝
        case CallState.CANCEL:
        return t('calls.canceled');
      case CallState.TIMEOUT:
        return t('calls.timeout');
      case CallState.BUSY:
        return t('calls.busy');
      case CallState.NETWORK_ERROR:
        return t('calls.networkError');
      default:
        return '';
    }
  };

  return (
    <div className={clsx(styles.bubble, 'flex items-center gap-2 !py-2')}>
      <img 
        src={isVideo ? call_video : call_audio} 
        alt={isVideo ? 'video call' : 'audio call'}
        className="w-[18px] h-[18px]"
      />
      <span className="text-[14px]">{getStateText()}</span>
    </div>
  );
};

export default CallMessageRender; 