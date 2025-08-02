import {
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { CbEvents, MessageType } from "@openim/wasm-client-sdk";
import {
  MessageItem,
  RtcInvite,
  WSEvent,
} from "@openim/wasm-client-sdk/lib/types/entity";
import clsx from "clsx";
import { t } from "i18next";
import { RemoteParticipant, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef } from "react";

import { getRtcConnectData } from "@/api/imApi";
import rtc_accept from "@/assets/images/rtc/rtc_accept.png";
import rtc_camera from "@/assets/images/rtc/rtc_camera.png";
import rtc_camera_off from "@/assets/images/rtc/rtc_camera_off.png";
import rtc_hungup from "@/assets/images/rtc/rtc_hungup.png";
import rtc_mic from "@/assets/images/rtc/rtc_mic.png";
import rtc_mic_off from "@/assets/images/rtc/rtc_mic_off.png";
import liveRing from "@/assets/audio/live_ring.wav";
import { CustomType } from "@/constants";
import { IMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import emitter from "@/utils/events";

import { CounterHandle, ForwardCounter } from "./Counter";
import { AuthData } from "./data";

interface IRtcControlProps {
  isWaiting: boolean;
  isRecv: boolean;
  isConnected: boolean;
  invitation: RtcInvite;
  connectRtc: (data?: AuthData) => void;
  closeOverlay: () => void;
  sendCustomSignal: (recvID: string, customType: CustomType) => Promise<void>;
}
export const RtcControl = ({
  isWaiting,
  isRecv,
  isConnected,
  invitation,
  connectRtc,
  closeOverlay,
  sendCustomSignal,
}: IRtcControlProps) => {
  const room = useRoomContext();
  const localParticipantState = useLocalParticipant();
  const counterRef = useRef<CounterHandle>(null);
  const audioRef = useRef<HTMLAudioElement>();
  const isHangingUp = useRef(false);
  const hasConnected = useRef(false);
  const messageSent = useRef(false);

  const recvID = isRecv ? invitation.inviterUserID : invitation.inviteeUserIDList[0];
  const isVideoCall = invitation.mediaType === "video";

  useEffect(() => {
    if (isConnected) {
      hasConnected.current = true;
    }
  }, [isConnected]);

  // 播放提示音
  const playCallRing = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(liveRing);
      audioRef.current.loop = true;
    }
    audioRef.current.play().catch(console.error);
  };

  // 停止提示音
  const stopCallRing = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // 监听通话状态，播放/停止提示音
  useEffect(() => {
    if (isWaiting && isRecv) {
      playCallRing();
    }
    return () => {
      stopCallRing();
    };
  }, [isWaiting, isRecv]);

  // 处理通话事件
  useEffect(() => {
    const acceptHandler = async ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      stopCallRing();
      const { data } = await getRtcConnectData(
        roomID,
        useUserStore.getState().selfInfo.userID,
      );
      connectRtc(data);
    };

    const rejectHandler = async ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      stopCallRing();
      // 如果是发起者，需要发送通话记录
      if (!isRecv) {
        await createCallRecord("reject");
      }
      closeOverlay();
    };

    const hangupHandler = async ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      stopCallRing();
      // 如果是发起者，需要发送通话记录
      if (!isRecv) {
        await createCallRecord("hangup");
      }
      room.disconnect();
      closeOverlay();
    };

    const cancelHandler = async ({ roomID }: RtcInvite) => {
      if (invitation.roomID !== roomID) return;
      if (!isWaiting) return;
      stopCallRing();
      closeOverlay();
    };

    const participantDisconnectedHandler = async (
      remoteParticipant: RemoteParticipant,
    ) => {
      const identity = remoteParticipant.identity;
      if (
        identity === invitation.inviterUserID ||
        identity === invitation.inviteeUserIDList[0]
      ) {
        stopCallRing();

        room.disconnect();
        closeOverlay();
      }
    };

    const newMessageHandler = ({ data }: WSEvent<MessageItem[]>) => {
      data.map((message) => {

        if (message.contentType === MessageType.CustomMessage) {
          const customData = JSON.parse(message.customElem!.data) as {
            data: any;
            customType: number;
          };

          // 检查是否是通话同步消息
          if (customData.customType === 2005) {
            const { status, source } = customData.data;
            // 如果消息来源不是web，则关闭通话弹框
            if (source !== 'web') {
              stopCallRing();
              feedbackToast({ msg: t("toast.handleByOtherDevice") });
              closeOverlay();
              return;
            }
          }

          if (customData.customType === CustomType.CallingAccept) {
            acceptHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingReject) {
            rejectHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingCancel) {
            cancelHandler(customData.data);
          }
          if (customData.customType === CustomType.CallingHungup) {
            hangupHandler(customData.data);
          }
        }
      });
    };

    IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
    room.on(RoomEvent.ParticipantDisconnected, participantDisconnectedHandler);
    return () => {
      stopCallRing(); // 组件卸载时停止提示音
      IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
      room.off(RoomEvent.ParticipantDisconnected, participantDisconnectedHandler);
    };
  }, [room, invitation.roomID, isWaiting]);

  const createCallRecord = async (state: string) => {
    if (messageSent.current) return;
    messageSent.current = true;


    // 只有发起者才发送通话记录
    if (invitation.inviterUserID === useUserStore.getState().selfInfo.userID) {
      const duration = counterRef.current?.getDuration() ?? 0;
      const messageData = {
        data: {
          type: invitation.mediaType === "video" ? "video" : "audio",
          state,
          duration,
          from: invitation.inviterUserID,
        },
        customType: CustomType.CallRecord,
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(messageData),
        extension: "",
        description: "",
      });


      // 发送给对方
      await IMSDK.sendMessage({
        recvID: invitation.inviteeUserIDList[0], // 发给被邀请者
        groupID: "",
        message,
      });

      // 设置完整的消息状态
      message.isRead = true;
      message.status = 2; // 2 表示发送成功
      message.sendTime = Date.now();
      message.sendID = invitation.inviterUserID;
      message.recvID = invitation.inviteeUserIDList[0];
      emitter.emit("PUSH_NEW_MSG", message);
    }
  };

  const hungup = async () => {
    isHangingUp.current = true;
    stopCallRing();

    // 主动挂断
    if (isWaiting) {
      // 等待接听时主动挂断
      const customType = isRecv ? CustomType.CallingReject : CustomType.CallingCancel;
      const callData = {
        customType: 2005,
        data: {
          status: "reject",
          source: "web",
        },
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(callData),
        extension: "",
        description: "通话消息",
      });

      await IMSDK.sendMessage({
        // recvID,
        recvID: useUserStore.getState().selfInfo.userID,

        message,
        groupID: "",
        isOnlineOnly: true,
      });
      // 1. 发送信令消息
      await sendCustomSignal(recvID, customType);
      // 2. 如果是发起者取消，才发送通话记录
      if (!isRecv) {
        await createCallRecord("cancel");
      }
      closeOverlay();
      return;
    }

    // 通话中主动挂断
    // 1. 发送信令消息
    await sendCustomSignal(recvID, CustomType.CallingHungup);
    // 2. 如果是发起者挂断，才发送通话记录
    if (!isRecv) {
      await createCallRecord("hangup");
    }
    room.disconnect();
  };

  const acceptInvitation = async () => {
    try {
      stopCallRing();
      const callData = {
        customType: 2005,
        data: {
          status: "accept",
          source: "web",
        },
      };
      const { data: message } = await IMSDK.createCustomMessage({
        data: JSON.stringify(callData),
        extension: "",
        description: "通话消息",
      });


      await IMSDK.sendMessage({
        // recvID,
        recvID: useUserStore.getState().selfInfo.userID,

        message,
        groupID: "",
        isOnlineOnly: true,
      });

      await sendCustomSignal(recvID, CustomType.CallingAccept);
      const { data } = await getRtcConnectData(
        invitation.roomID,
        useUserStore.getState().selfInfo.userID,
      );

      connectRtc(data);
    } catch (error) {
      closeOverlay();
    }
  };

  // 在组件卸载时重置标记
  useEffect(() => {
    return () => {
      messageSent.current = false;
    };
  }, []);

  return (
    <div className="ignore-drag absolute bottom-[6%] z-10 flex justify-center">
      {!isWaiting && (
        <ForwardCounter
          ref={counterRef}
          className={clsx("absolute -top-8")}
          isConnected={isConnected}
        />
      )}
      {!isWaiting && (
        <TrackToggle
          className="flex cursor-pointer flex-col items-center !justify-start !gap-0 !p-0"
          source={Track.Source.Microphone}
          showIcon={false}
        >
          <img
            width={48}
            src={localParticipantState.isMicrophoneEnabled ? rtc_mic : rtc_mic_off}
            alt=""
          />
          <span className="mt-2 text-xs text-white">{t("placeholder.microphone")}</span>
        </TrackToggle>
      )}
      <div
        className={clsx("ml-12 flex cursor-pointer flex-col items-center", {
          "mr-12": isVideoCall,
          "!mx-0": !isRecv && isWaiting,
        })}
        onClick={hungup}
      >
        <img width={48} src={rtc_hungup} alt="" />
        <span
          className={clsx("mt-2 text-xs text-white", {
            "!text-[var(--sub-text)]": isWaiting,
          })}
        >
          {isWaiting ? t("cancel") : t("hangUp")}
        </span>
      </div>
      {isRecv && isWaiting && (
        <div
          className="mx-12 flex cursor-pointer flex-col items-center"
          onClick={acceptInvitation}
        >
          <img width={48} src={rtc_accept} alt="" />
          <span
            className={clsx("mt-2 text-xs text-white", {
              "!text-[var(--sub-text)]": isWaiting,
            })}
          >
            {t("answer")}
          </span>
        </div>
      )}
      {!isWaiting && isVideoCall && (
        <TrackToggle
          className="flex cursor-pointer flex-col items-center justify-start !gap-0 !p-0"
          source={Track.Source.Camera}
          showIcon={false}
        >
          <img
            width={48}
            src={localParticipantState.isCameraEnabled ? rtc_camera : rtc_camera_off}
            alt=""
          />
          <span className="mt-2 text-xs text-white">{t("placeholder.camera")}</span>
        </TrackToggle>
      )}
    </div>
  );
};
