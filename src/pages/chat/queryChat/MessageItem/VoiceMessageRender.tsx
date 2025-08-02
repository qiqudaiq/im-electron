import { useMount, useUnmount, useUpdateEffect } from "ahooks";
import clsx from "clsx";
import { t } from "i18next";
import { FC, useRef, useState, useEffect } from "react";

import VoiceIcon from "@/svg/VoiceIcon";
import { feedbackToast } from "@/utils/common";
import { getResourceUrl } from "@/utils/common";

import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

// 全局唯一音频实例
const getGlobalAudio = () => {
  if (!(window as any).__globalVoiceAudio) {
    (window as any).__globalVoiceAudio = new Audio();
  }
  return (window as any).__globalVoiceAudio as HTMLAudioElement;
};

// 全局当前播放的语音ID
const setGlobalPlayingId = (id: string | null) => {
  (window as any).__globalVoicePlayingId = id;
  window.dispatchEvent(new CustomEvent("voice-playing-id-changed", { detail: id }));
};
const getGlobalPlayingId = (): string | null => {
  return (window as any).__globalVoicePlayingId || null;
};

const VoiceMessageRender: FC<IMessageItemProps> = ({ message, isSender, disabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(true);
  const [isUserInitiated, setIsUserInitiated] = useState(false);
  const [globalPlayingId, setGlobalPlayingIdState] = useState<string | null>(getGlobalPlayingId());

  // 只有当前气泡的ID等于全局播放ID时，才显示播放动画
  const isPlaying = globalPlayingId === message.clientMsgID;

  // 清理 blob
  const cleanup = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setHasError(false);
    setIsUserInitiated(false);
  };

  useUnmount(() => {
    setIsComponentMounted(false);
    cleanup();
  });

  // 加载音频
  const loadAudio = async () => {
    let url = message.soundElem!.sourceUrl;
    url = getResourceUrl(url);
    setIsLoading(true);
    setHasError(false);
    cleanup();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    } catch (e) {
      setHasError(true);
      if (isComponentMounted) {
        feedbackToast({ error: e, msg: '音频加载失败' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useMount(() => {
    loadAudio();
  });

  useUpdateEffect(() => {
    loadAudio();
  }, [message.soundElem?.sourceUrl]);

  // 监听全局播放ID变化，驱动动画
  useEffect(() => {
    const handler = (e: any) => {
      setGlobalPlayingIdState(e.detail);
    };
    window.addEventListener("voice-playing-id-changed", handler);
    return () => window.removeEventListener("voice-playing-id-changed", handler);
  }, []);

  const playAudio = () => {
    if (isLoading || hasError || !blobUrl) {
      if (hasError) loadAudio();
      return;
    }
    const audio = getGlobalAudio();
    // 先暂停上一个
    audio.pause();
    audio.src = blobUrl;
    audio.currentTime = 0;
    setIsUserInitiated(true);
    setGlobalPlayingId(message.clientMsgID);
    audio.onended = () => setGlobalPlayingId(null);
    audio.onpause = () => setGlobalPlayingId(null);
    audio.onplay = () => setGlobalPlayingId(message.clientMsgID);
    audio.onerror = (e) => {
      setHasError(true);
      setGlobalPlayingId(null);
      if (isComponentMounted && isUserInitiated) {
        feedbackToast({ error: '音频播放失败', msg: '音频播放失败' });
      }
    };
    audio.play().catch(e => {
      if (isComponentMounted && isUserInitiated) {
        feedbackToast({ error: e, msg: t("toast.playAudioFailed") });
      }
    });
  };

  return (
    <div
      className={clsx(
        styles.bubble,
        "relative flex cursor-pointer items-center !py-2",
        !isSender && "flex-row-reverse",
        disabled && "justify-end"
      )}
      onClick={playAudio}
    >
      <VoiceIcon
        style={{ transform: isSender ? "rotateY(180deg)" : "none" }}
        playing={isPlaying}
      />
      <span className={isSender ? "mr-1" : "ml-1"}>
        {`${message.soundElem!.duration} ''`}
      </span>
    </div>
  );
};

export default VoiceMessageRender;
