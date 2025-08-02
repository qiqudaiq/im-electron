import { create } from "zustand";
import { liveStreamAPI } from '@/api/live';
import { message } from 'antd';
import { t } from 'i18next';

export interface LiveStreamState {
  isLoading: boolean;
  error: string | null;
  currentRoom: string | null;
  isHost: boolean;
}

export interface CreateStreamParams {
  roomName?: string;
  enableChat?: boolean;
  allowParticipation?: boolean;
  detail?: string;
  cover?: string;
}

export interface LiveStreamStore extends LiveStreamState {
  // Actions
  createStream: (params: CreateStreamParams) => Promise<{ auth_token: any; room_token: any; ws_url: any; room_name: any }>;
  joinStream: (roomName: string) => Promise<any>;
  raiseHand: () => Promise<void>;
  approveHandRaise: (identity: string) => Promise<void>;
  removeFromStage: (room_name:string,identity: string) => Promise<void>;
  blockViewer: (identity: string) => Promise<void>;
  inviteToStage: (identity: string) => Promise<void>;
  stopStream: () => Promise<void>;
  
  // State setters
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentRoom: (room: string | null) => void;
  setIsHost: (isHost: boolean) => void;
  clearState: () => void;
}

export const useLiveStreamStore = create<LiveStreamStore>()((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  currentRoom: null,
  isHost: false,

  // State setters
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
    if (error) {
      message.error(error);
    }
  },

  setCurrentRoom: (room: string | null) => {
    set({ currentRoom: room });
  },

  setIsHost: (isHost: boolean) => {
    set({ isHost });
  },

  clearState: () => {
    set({
      isLoading: false,
      error: null,
      currentRoom: null,
      isHost: false,
    });
  },

  // Actions
  createStream: async (params: CreateStreamParams) => {
    const { setLoading, setError } = get();
    
    setLoading(true);
    setError(null);

    try {
      const res = await liveStreamAPI.createStream({
        metadata: {
          nickname: params.roomName,
          enable_chat: params.enableChat ?? true,
          allow_participation: params.allowParticipation ?? true,
          detail: params.detail || '',
          cover: params.cover || '',
        },
      });

      const {
        auth_token,
        room_name,
        connection_details: { token, ws_url },
      } = res.data;

      // 更新状态
      set({
        currentRoom: room_name || "",
        isHost: true,
        isLoading: false,
      });


      // 返回token用于页面跳转
      return { auth_token, room_token: token, ws_url, room_name };
    } catch (error: any) {
      setError(error.message || t("livestream.createFailed"));
      setLoading(false);
      throw error;
    }
  },

  joinStream: async (roomName: string) => {
    const { setLoading, setError } = get();
    
    setLoading(true);
    setError(null);

    try {
      const res = await liveStreamAPI.joinStream({
        room_name: roomName,
      });

      // 更新状态
      set({
        currentRoom: roomName,
        isHost: false,
        isLoading: false,
      });


      return res.data;
    } catch (error: any) {
      setError(error.message || t("livestream.joinFailed"));
      setLoading(false);
      throw error;
    }
  },

  raiseHand: async () => {
    const { currentRoom, setError } = get();
    
    if (!currentRoom) return;

    try {
      await liveStreamAPI.raiseHand({
        room_name: currentRoom,
      });
      message.success(t("livestream.handRaiseSent"));
    } catch (error: any) {
      setError(error.message || t("livestream.handRaiseFailed"));
    }
  },

  approveHandRaise: async (identity: string) => {
    const { setError } = get();
    
    try {
      await liveStreamAPI.approveHandRaise({ identity });
      message.success(t("livestream.userApproved"));
    } catch (error: any) {
      setError(error.message || t("livestream.operationFailed"));
    }
  },

  removeFromStage: async (room_name:string,identity: string) => {
    const { setError } = get();
    
    try {
      await liveStreamAPI.removeFromStage({ room_name,identity });
      message.success(t("livestream.userRemovedFromStage"));
    } catch (error: any) {
      setError(error.message || t("livestream.operationFailed"));
    }
  },

  blockViewer: async (identity: string) => {
    const { setError } = get();
    
    try {
      await liveStreamAPI.blockViewer({ identity });
      message.success(t("livestream.userBlocked"));
    } catch (error: any) {
      setError(error.message || t("livestream.blockFailed"));
    }
  },

  inviteToStage: async (identity: string) => {
    const { currentRoom, setError } = get();
    
    try {
      await liveStreamAPI.inviteToStage({
        room_name: currentRoom || "",
        identity,
      });
      message.success(t("livestream.invitationSent"));
    } catch (error: any) {
      setError(error.message || t("livestream.invitationFailed"));
    }
  },

  stopStream: async () => {
    const { currentRoom, setError } = get();
    
    if (!currentRoom) return;

    try {
      await liveStreamAPI.stopStream({
        room_name: currentRoom,
      });
      
      set({
        currentRoom: null,
        isHost: false,
      });
      
      message.success(t("livestream.streamEnded"));
    } catch (error: any) {
      setError(error.message || t("livestream.endStreamFailed"));
    }
  },
})); 