import { v4 as uuidv4 } from "uuid";
import createAxiosInstance from "@/utils/request";
import { getChatToken } from "@/utils/storage";
import { globalConfig } from "@/utils/globalConfig";

// 动态获取request实例，确保使用最新的globalConfig
const getRequest = () => {
  return createAxiosInstance(globalConfig.chatUrl);
};



export const joinLiveStream = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/join_stream",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};





export const inviteToStage = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/invite_to_stage",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};





export const stopStream = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/stop_stream",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const setAsAdmin = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/set_admin",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const revokeAdmin = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/revoke_admin",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const getLivestreamStatistics = async (params: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<{ data: { room_name: string } }>(
    "/third/livestream_statistics/single",
    {
      params,
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};



export const createLiveStreamV2 = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/create_stream",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const approveHandRaiseV2 = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/approve_hand_raise",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const removeFromStageV2 = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/remove_from_stage",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const blockViewerV2 = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/block_viewer",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const raiseHandV2 = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/livestream/raise_hand",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const handleLiveStreamError = (error: any) => {
  console.error('直播API调用错误:', error);
};

const wrapWithErrorHandling = (apiFunc: Function) => {
  return async (...args: any[]) => {
    try {
      return await apiFunc(...args);
    } catch (error) {
      handleLiveStreamError(error);
    }
  };
};

export const liveStreamAPI = {
  createStream: wrapWithErrorHandling(createLiveStreamV2),
  joinStream: wrapWithErrorHandling(joinLiveStream),
  raiseHand: wrapWithErrorHandling(raiseHandV2),
  approveHandRaise: wrapWithErrorHandling(approveHandRaiseV2),
  inviteToStage: wrapWithErrorHandling(inviteToStage),
  removeFromStage: wrapWithErrorHandling(removeFromStageV2),
  blockViewer: wrapWithErrorHandling(blockViewerV2),
  stopStream: wrapWithErrorHandling(stopStream),
  setAsAdmin: wrapWithErrorHandling(setAsAdmin),
  revokeAdmin: wrapWithErrorHandling(revokeAdmin),
  getStatistics: wrapWithErrorHandling(getLivestreamStatistics),
};