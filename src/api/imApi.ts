import { v4 as uuidv4 } from "uuid";

import createAxiosInstance from "@/utils/request";
import { getChatToken } from "@/utils/storage";
import { globalConfig } from "@/utils/globalConfig";

// 动态获取request实例，确保使用最新的globalConfig
const getRequest = () => {
  return createAxiosInstance(globalConfig.chatUrl);
};

export const getRtcConnectData = async (room: string, identity: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<{ serverUrl: string; token: string }>(
    "/user/rtc/get_token",
    {
      room,
      identity,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

// 获取直播统计列表
export const getLiveStreamList = async (params: {
  page?: string;
  page_size?: string;
  keyword?: string;
}) => {
  const token = (await getChatToken()) as string;
  return getRequest().get("/third/livestream_statistics/list", {
    params,
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};
