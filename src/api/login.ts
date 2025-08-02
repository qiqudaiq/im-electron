import type { MessageReceiveOptType } from "@openim/wasm-client-sdk";
import { useMutation } from "react-query";
import { v4 as uuidv4 } from "uuid";

import { useUserStore } from "@/store";
import createAxiosInstance from "@/utils/request";
import { getChatToken } from "@/utils/storage";
import { globalConfig } from "@/utils/globalConfig";

import { errorHandle } from "./errorHandle";

// 动态获取request实例，确保使用最新的globalConfig
const getRequest = () => {
  return createAxiosInstance(globalConfig.chatUrl);
};

const platform = window.electronAPI?.getPlatform() ?? 5;

const getAreaCode = (code?: string) =>
  code ? (code.includes("+") ? code : `+${code}`) : code;

// Send verification code
export const useSendSms = () => {
  return useMutation(
    (params: API.Login.SendSmsParams) =>
      getRequest().post(
        "/account/code/send",
        {
          ...params,
        },
        {
          headers: {
            operationID: uuidv4(),
          },
        },
      ),
    {
      onError: errorHandle,
    },
  );
};

// Verify mobile phone number
export const useVerifyCode = () => {
  return useMutation(
    (params: API.Login.VerifyCodeParams) =>
      getRequest().post(
        "/account/code/verify",
        {
          ...params,
          areaCode: getAreaCode(params.areaCode),
        },
        {
          headers: {
            operationID: uuidv4(),
          },
        },
      ),
    {
      onError: errorHandle,
    },
  );
};

// register
export const useRegister = () => {
  return useMutation(
    (params: API.Login.DemoRegisterType) =>
      getRequest().post<{ chatToken: string; imToken: string; userID: string }>(
        "/third/user/register_via_account",
        {
          ...params,
          user: {
            ...params.user,
            areaCode: getAreaCode(params.user.areaCode),
          },
          platform,
        },
        {
          headers: {
            operationID: uuidv4(),
          },
        },
      ),
    {
      onError: errorHandle,
    },
  );
};

// reset passwords
export const useReset = () => {
  return useMutation(
    (params: API.Login.ResetParams) =>
      getRequest().post(
        "/account/password/reset",
        {
          ...params,
          areaCode: getAreaCode(params.areaCode),
        },
        {
          headers: {
            operationID: uuidv4(),
          },
        },
      ),
    {
      onError: errorHandle,
    },
  );
};

// change password
export const modifyPassword = async (params: API.Login.ModifyParams) => {
  const token = (await getChatToken()) as string;
  return getRequest().post(
    "/account/password/change",
    {
      ...params,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};
export const emailRegister = async (params: any) => {
  return getRequest().post(
    "/third/user/register",
    {
      ...params,
    },
    {
      headers: {
        operationID: uuidv4(),
      },
    },
  );
};

export const modifyEmail = async (params) => {
  const token = (await getChatToken()) as string;
  return getRequest().post(
    "/third/user/change_email",
    {
      ...params,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const selectAllOrg = async (token?: string) => {
  return getRequest().get("/third/organization_user/get_self_all_org", {
    headers: {
      token: token || ((await getChatToken()) as string),
      orgId: "123",
      operationID: uuidv4(),
    },
  });
};

export const get_self_org_role_permission = async (token?: string) => {
  return getRequest().get("/third/organization_role_permission/get_self_org_role_permission", {
    headers: {
      token: token || ((await getChatToken()) as string),
      operationID: uuidv4(),
    },
  });
};

export const changeOrg = async (token: string, org_id: string) => {
  return getRequest().post(
    "/third/organization_user/change_org_user",
    {
      org_id: org_id,
      platform,
    },
    {
      headers: {
        token: token || ((await getChatToken()) as string),
        operationID: uuidv4(),
      },
    },
  );
};
export const joinOrg = async (invitation_code: string, nickname?: string, face_url?: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post(
    "/third/organization/join_using_invitation_code",
    {
      invitation_code,
      nickname,
      face_url
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

// log in
export const useLogin = () => {
  return useMutation(
    (params: API.Login.LoginParams) =>
      getRequest().post<{ chatToken: string; imToken: string; userID: string }>(
        "/account/login",
        {
          ...params,
          platform,
          areaCode: getAreaCode(params.areaCode),
        },
        {
          headers: {
            operationID: uuidv4(),
          },
        },
      ),
    // {
    //   onError: errorHandle,
    // },
  );
};

// Get user information
export interface BusinessUserInfo {
  userID: string;
  password: string;
  account: string;
  phoneNumber: string;
  areaCode: string;
  email: string;
  nickname: string;
  faceURL: string;
  gender: number;
  level: number;
  birth: number;
  allowAddFriend: BusinessAllowType;
  allowBeep: BusinessAllowType;
  allowVibration: BusinessAllowType;
  globalRecvMsgOpt: MessageReceiveOptType;
  permissions: string[];
  can_send_free_msg:number
}

export enum BusinessAllowType {
  Allow = 1,
  NotAllow = 2,
}

export const getBusinessUserInfo = async (userIDs: string[]) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<{ users: BusinessUserInfo[] }>(
    "/third/user/find/full",
    {
      userIDs,
    },
    {
      headers: {
        operationID: uuidv4(),
        token,
      },
    },
  );
};

export const searchBusinessUserInfo = async (keyword: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<{ total: number; users: BusinessUserInfo[] }>(
    "/third/user/search/full",
    {
      keyword,
      pagination: {
        pageNumber: 1,
        showNumber: 1,
      },
    },
    {
      headers: {
        operationID: uuidv4(),
        token,
      },
    },
  );
};

interface UpdateBusinessUserInfoParams {
  email: string;
  nickname: string;
  faceURL: string;
  gender: number;
  birth: number;
  allowAddFriend: number;
  allowBeep: number;
  allowVibration: number;
  globalRecvMsgOpt: number;
}

export const updateBusinessUserInfo = async (
  params: Partial<UpdateBusinessUserInfoParams>,
) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/user/update_info",
    {
      ...params,
      userID: useUserStore.getState().selfInfo?.userID,
    },
    {
      headers: {
        operationID: uuidv4(),
        token,
      },
    },
  );
};

// check wallet exist
export const checkWalletExist = async (token: string) => {
  return getRequest().get<{ data: boolean }>("/third/wallet/exist", {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};

// check user password
export const checkPassWord = async (pwd: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/account/compare",
    {
      pwd,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

// get encrypt public key
export const getPublicKey = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/wallet/pay_pwd/key", {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};

// init wallet
interface PublicKeyResponse {
  errCode?: number;
  errMsg: string;
  errDlt: string;
  data?: {
    key: string;
  };
}
export const initWallet = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<PublicKeyResponse>("/third/wallet/create", data, {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};

// get wallet balance
export const getWalletBalance = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<{ data: { available_balance: string } }>("/third/wallet/balance", {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};
export const getWalletBalanceGroupByOrg = async (orgId: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<{ data: { available_balance: string } }>(
    "/third/wallet_balance/get_balance",
    {
      params: {
        org_id: orgId,
      },
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

export const getCaptcha = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/captcha/image", {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};

// getTransferRecord
export const getTransferRecord = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("127.0.0.1:10008/third/walletTsRecord/ts/detail", {
    headers: {
      token,
      operationID: uuidv4(),
    },
  });
};

// changePaymentPassword
export const changePaymentPassword = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/wallet/pay_pwd/update",
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

// get encrypt AES key
export const getAESkey = async (rsa_public_key: string, token: string) => {
  return getRequest().post<unknown>(
    "/third/user_keys/setup",
    {
      rsa_public_key,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        source: "web",
      },
    },
  );
};

// create transfer
export const CreateTransfer = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>("/third/transaction/create", data, {
    headers: {
      token,
      operationID: uuidv4(),
      source: "web",
    },
  });
};

// recharge Balance
export const RechargeBalance = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/wallet/balance/recharge/test",
    {
      amount: "100",
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

// receive transfer
export const ReceiveTransfer = async (transaction_id: string, password?: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/transaction/receive",
    {
      transaction_id,
      password,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};

// check receive transfer
export const CheckReceiveTransfer = async (transaction_id: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/transaction/check_received",
    {
      transaction_id,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};

// 查询用户24小时接收交易历史记录
export const GetReceiveHistory = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/transaction/receive_history", {
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

// 批量查询钱包交易记录详情
export const GetTransactionDetail = async (params: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<{ data: { available_balance: string } }>(
    "/third/walletTsRecord/ts",
    {
      params,
      headers: {
        token,
        operationID: uuidv4(),
      },
    },
  );
};

// 判断交易是否领取完
export const CheckCompleted = async (transaction_id: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/transaction/check_completed",
    {
      transaction_id,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};

// 获取红包详情
export const getRedPacketDetail = async (transaction_id: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/transaction/receive_details", {
    params: {
      transaction_id,
    },
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

// 获取汇率
export const getExchangeRate = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/exchange_rate/latest", {
    params: {
      base: "CNY",
    },
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

// 获取所有代币信息
export const getTokenInfo = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/wallet/currencies", {
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

export const createOrgGroup = async (data: any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/dep_admin/group/create",
    {
      ...data,
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};

//用户打卡
export const checkInCreate = async () => {
  const token = (await getChatToken()) as string;
  return getRequest().post<unknown>(
    "/third/checkin/create",
   null,
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};

//用户查询奖品记录
export const lottery_user_recordList = async (params:any) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<any>(
    "/third/lottery_user_record/list",
    params,
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};


//抽奖
export const lottery_user_ticket_use = async (params:any) => {
  const token =params?.token || (await getChatToken()) as string;
  return getRequest().post<any>(
    "/third/lottery_user_ticket/use",
   {
      lottery_ticket_id:params.lottery_ticket_id
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
        ...params
      },
    },
  );
};


//获取用户登录信息
export const user_login_record = async (user_id: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().post<any>(
    "/third/user/login_record",
   {
      user_id
    },
    {
      headers: {
        token,
        operationID: uuidv4(),
        "Content-Type": "application/json",
      },
    },
  );
};




export const checkinDetail = async (params?: { startTime?: number; endTime?: number }) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/checkin/detail", {
    params,
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

export interface TicketDetailParams {
  page: number;
  pageSize: number;
}

export const lottery_user_ticketDetail = async (params?: { page?: number; pageSize?: number }) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/lottery_user_ticket/detail", {
    params: {
      page: String(params?.page),
      pageSize: String(params?.pageSize)
    },
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

//用户查询抽奖活动详情
export const lotteryDetail = async (params: { id: string}) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/lottery/detail", {
    params:{
      id:params.id
    },
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
      ...params
    },
  });
};


//用户查看当前组织签到奖励记录
export const checkinRewardList = async (params?: { page?: number; pageSize?: number,status?:string }) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<unknown>("/third/checkin_reward/list", {
    params,
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

// 获取文章详情
export const getArticleDetail = async (id: string) => {
  const token = (await getChatToken()) as string;
  return getRequest().get<{
    title: string;
    content: string;
    updated_at: string;
    id: string;
    created_at?: string;
  }>(`/third/article/${id}`, {
    headers: {
      token,
      operationID: uuidv4(),
      "Content-Type": "application/json",
    },
  });
};

export namespace API {
  export namespace Login {
    export interface LoginParams {
      username: string;
      password: string;
    }

    export interface RegisterParams {
      username: string;
      password: string;
      nickname: string;
    }
  }
}
