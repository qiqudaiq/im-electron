import axios from "axios";
import { t } from "i18next";
import { v4 as uuidv4 } from "uuid";

import { useUserStore } from "@/store";
import { getErrCodeMessage } from "@/constants/errcode";

import { getChatToken, getIMToken } from "./storage";
import { feedbackToast } from "./common";
import { ApiAutoRoute } from "./apiAutoRoute";
import errorCapture from "./errorCapture";

const tokenErrorCodeList = [1501, 1503, 1504, 1505];

const createAxiosInstance = (baseURL: string, imToken = true) => {
  
  
 // Electron版本：保持原有逻辑
      if (!baseURL || (!baseURL.startsWith('http://') && !baseURL.startsWith('https://'))) {
        const currentHost = window.location.hostname;
        const protocol = window.location.protocol;

        // 检查是否为 IP 地址
        const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(currentHost);

        if (isIpAddress && import.meta.env.VITE_CHAT_URL1) {
          baseURL = `${protocol}//${currentHost}${import.meta.env.VITE_CHAT_URL1}`;
        } else {
          baseURL = `${protocol}//${currentHost}${baseURL}`;
        }
      }
const serves = axios.create({
    baseURL,
    timeout: 25000,
  });

  serves.interceptors.request.use(
    async (config) => {
      const token = imToken ? await getIMToken() : await getChatToken();
      const orgId = localStorage.getItem("current_org_id") || '123';
      config.headers.token = config.headers.token ?? token;
      config.headers.operationID = uuidv4();
      config.headers.orgId = config.headers.orgId??orgId;
      config.headers.source = config.headers.source??"web";
      return config;
    },
    (err) => Promise.reject(err),
  );


  serves.interceptors.request.use(
    async (config) => {
      const token = imToken ? await getIMToken() : await getChatToken();
      const orgId = localStorage.getItem("current_org_id") || '123';
      config.headers.token = config.headers.token ?? token;
      config.headers.operationID = uuidv4();
      config.headers.orgId = config.headers.orgId??orgId;
      config.headers.source = config.headers.source??"web";
      return config;
    },
    (err) => Promise.reject(err),
  );

  serves.interceptors.response.use(
    (res) => {
      // if (tokenErrorCodeList.includes(res.data.errCode)) {
      //   feedbackToast({
      //     msg: t("toast.loginExpiration"),
      //     error: t("toast.loginExpiration"),
      //     onClose: () => {
      //       useUserStore.getState().userLogout(true);
      //     },
      //   });
      // }
      if (res.data.errCode !== 0) {
        const errMsg = getErrCodeMessage(res.data.errCode);
        if(errMsg){
          feedbackToast({
            msg: errMsg,
            error: errMsg,
          });
        }
        
        // 捕获业务逻辑错误到本地
        const config = res.config || {};
        errorCapture.capture(
          'api_business',
          `${errMsg} - ${config.url}`,
          undefined,
          config.url || 'unknown'
        );
       
        return Promise.reject({ ...res.data, errMsg });
      }
      return res.data;
    },
    (err) => {
      let errMsg = t("errCode.systemError");
      let shouldTriggerAutoRoute = false;
      
      // 捕获API错误到本地
      const config = err.config || {};
      errorCapture.capture(
        'api_network',
        `${errMsg} - ${config.url}`,
        err.stack,
        config.url || 'unknown'
      );
      
      if (err.message.includes("timeout")) {
        errMsg = t("errCode.timeout");
        shouldTriggerAutoRoute = true;
        console.error("error", err);
      }
      if (err.message.includes("Network Error")) {
        errMsg = t("errCode.networkError");
        shouldTriggerAutoRoute = true;
        console.error("error", err);
      }
      
      // 检查是否是服务器不可用的错误（5xx错误或连接错误）
      if (err.response) {
        const statusCode = err.response.status;
        // 5xx服务器错误才触发寻路，4xx客户端错误不触发
        if (statusCode >= 500 && statusCode < 600) {
          shouldTriggerAutoRoute = true;
          console.error("服务器错误:", statusCode, err);
        }
      } else if (err.code) {
        // 网络层面的错误代码
        const networkErrorCodes = [
          'ECONNREFUSED',  // 连接被拒绝
          'ENOTFOUND',     // DNS解析失败
          'ECONNABORTED',  // 连接被中断
          'ECONNRESET',    // 连接被重置
          'ETIMEDOUT',     // 连接超时
          'ENETUNREACH',   // 网络不可达
          'EHOSTUNREACH'   // 主机不可达
        ];
        
        if (networkErrorCodes.includes(err.code)) {
          shouldTriggerAutoRoute = true;
          console.error("网络连接错误:", err.code, err);
        }
      }
      
      // 在Electron客户端的生产环境下，只有服务器不可用时才触发自动寻路
      const isElectron = Boolean(window.electronAPI);
      const isProduction = import.meta.env.MODE === 'production';
      
      if (isElectron && isProduction && shouldTriggerAutoRoute) {
        // 异步触发重新寻路，不阻塞当前错误处理
        ApiAutoRoute.onRequestFailed().catch(error => {
          console.error('自动寻路失败:', error);
        });
      }
      
      // feedbackToast({
      //   msg: errMsg,
      //   error: errMsg,
      // });
      return Promise.reject({ errMsg });
    },
  );

  return serves;
};

export default createAxiosInstance;
