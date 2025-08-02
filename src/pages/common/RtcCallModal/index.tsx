import "@livekit/components-styles";

import { LiveKitRoom } from "@livekit/components-react";
import { t } from "i18next";
import { VideoPresets } from "livekit-client";
import {
  forwardRef,
  ForwardRefRenderFunction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import DraggableModalWrap from "@/components/DraggableModalWrap";
import { CustomType } from "@/constants";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";

import { AuthData, InviteData } from "./data";
import { RtcLayout } from "./RtcLayout";

interface IRtcCallModalProps {
  inviteData: InviteData;
}

const RtcCallModal: ForwardRefRenderFunction<
  OverlayVisibleHandle,
  IRtcCallModalProps
> = ({ inviteData }, ref) => {
  const { invitation } = inviteData;
  const [connect, setConnect] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [authData, setAuthData] = useState<AuthData>({
    serverUrl: "",
    token: "",
  });
  const selfID = useUserStore((state) => state.selfInfo.userID);
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const timer = useRef<NodeJS.Timeout>();
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]); // 用于跟踪所有setTimeout

  const isRecv = selfID !== invitation?.inviterUserID;

  // 清理所有计时器的函数
  const clearAllTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  }, []);

  // 安全的setTimeout包装器
  const safeSetTimeout = useCallback((callback: () => void, delay?: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // 执行后从引用数组中移除
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  }, []);

  useEffect(() => {
    if (!isOverlayOpen) return;
    tryInvite();
    
    // 组件卸载时清理所有定时器
    return () => {
      clearAllTimeouts();
    };
  }, [isOverlayOpen, isRecv]);

  const checkTimeout = () => {
    if (timer.current) clearTimer();
    timer.current = setTimeout(() => {
      clearTimer();

      if (!invitation) return;

      sendCustomSignal(invitation?.inviteeUserIDList[0], CustomType.CallingCancel);
      closeOverlay();
    }, (invitation?.timeout ?? 30) * 1000);
  };

  const clearTimer = useCallback(() => clearTimeout(timer.current), []);

  const closeOverlayAndClearTimer = useCallback(() => {
    clearTimer();
    clearAllTimeouts(); // 同时清理所有setTimeout
    closeOverlay();
  }, []);

  const sendCustomSignal = useCallback(
    async (recvID: string, customType: CustomType) => {
      const data = {
        customType,
        data: {
          ...invitation,
        },
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(data),
        extension: "",
        description: "",
      });
      await IMSDK.sendMessage({
        recvID,
        message,
        groupID: "",
        isOnlineOnly: true,
      });
    },
    [invitation?.roomID],
  );

  const tryInvite = async () => {
    if (!isRecv) {
      try {
        await sendCustomSignal(
          invitation.inviteeUserIDList[0],
          CustomType.CallingInvite,
        );
        checkTimeout();
      } catch (error) {
        // feedbackToast({ msg: t("toast.inviteUserFailed"), error });
        closeOverlayAndClearTimer();
      }
    }
  };

  const connectRtc = useCallback((data?: AuthData) => {
    if (data) {
      setAuthData(data);
    }
    clearTimer();
    safeSetTimeout(() => setConnect(true)); // 使用安全的setTimeout
  }, []);



  return (
    <DraggableModalWrap
      title={null}
      footer={null}
      open={isOverlayOpen}
      closable={false}
      maskClosable={false}
      keyboard={false}
      mask={false}
      centered
      width="auto"
      onCancel={closeOverlay}
      destroyOnHidden
      ignoreClasses=".ignore-drag, .no-padding-modal, .cursor-pointer"
      className="no-padding-modal rtc-single-modal"
      wrapClassName="pointer-events-none"
    >
      <div>
        {isOverlayOpen && (
          <LiveKitRoom
            serverUrl={authData.serverUrl}
            token={authData.token}
            video={invitation?.mediaType === "video"}
            audio={true}
            connect={connect}
            options={{
              publishDefaults: {
                // 会议质量视频配置（最大720p）
                videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h540, VideoPresets.h360],
                videoEncoding: {
                  maxBitrate: 3_000_000,  // 2Mbps适合会议的码率
                  maxFramerate: 30        // 30fps适合会议的帧率
                },
                videoCodec: "h264",       // 更广泛兼容的编码器
                backupCodec: { codec: "vp8" },
                dtx: true,                // 启用不连续传输降低带宽占用
                red: true                 // 启用冗余编码提高稳定性
              },
              adaptiveStream: { 
                pixelDensity: 'screen',   // 根据屏幕密度优化
                pauseVideoInBackground: true
              },
              dynacast: true,             // 动态广播
              videoCaptureDefaults: {
                resolution: VideoPresets.h720  // 720p会议采集
              },
              stopLocalTrackOnUnpublish: false // 停止发布时保持本地轨道
            }}
            onConnected={() => setIsConnected(true)}
            onDisconnected={() => {
              closeOverlayAndClearTimer();
              setIsConnected(false);
              setConnect(false);
            }}
          >
            <RtcLayout
              connect={connect}
              isConnected={isConnected}
              isRecv={isRecv}
              inviteData={inviteData}
              sendCustomSignal={sendCustomSignal}
              connectRtc={connectRtc}
              closeOverlay={closeOverlayAndClearTimer}
            />
          </LiveKitRoom>
        )}
      </div>
    </DraggableModalWrap>
  );
};

export default forwardRef(RtcCallModal);
