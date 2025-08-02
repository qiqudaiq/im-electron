import { CustomEmojiItem } from "@/pages/chat/queryChat/MessageItem/FaceMessageRender";
import { LocaleString } from "@/store/type";
import * as localForage from "localforage";
import { encryptRememberPassword, decryptRememberPassword } from "./crypto";

localForage.config({
  name: "OpenCorp-Config",
});

type SendAction = "enter" | "enterwithshift";

export const setAreaCode = (areaCode: string) =>
  localStorage.setItem("IM_AREA_CODE", areaCode);
export const setPhoneNumber = (account: string) =>
  localStorage.setItem("IM_PHONE_NUM", account);
export const setEmail = (email: string) => localStorage.setItem("IM_EMAIL", email);
export const setLoginMethod = (method: string) =>
  localStorage.setItem("IM_LOGIN_METHOD", method);
export const setTMToken = (token: string) => localForage.setItem("IM_TOKEN", token);
export const setChatToken = (token: string) =>
  localForage.setItem("IM_CHAT_TOKEN", token);
export const setTMUserID = (userID: string) => localForage.setItem("IM_USERID", userID);
export const setIMProfile = ({
  chatToken,
  imToken,
  userID,
}: {
  chatToken: string;
  imToken: string;
  userID: string;
}) => {
  setTMToken(imToken);
  setChatToken(chatToken);
  setTMUserID(userID);
};

export const setAccessedFriendApplication = async (list: string[]) =>
  localForage.setItem(`${await getIMUserID()}_accessedFriendApplications`, list);
export const setAccessedGroupApplication = async (list: string[]) =>
  localForage.setItem(`${await getIMUserID()}_accessedGroupApplications`, list);
export const setUserCustomEmojis = async (list: CustomEmojiItem[]) =>
  localForage.setItem(`${await getIMUserID()}_customEmojis`, list);

export const setLocale = (locale: string) => localStorage.setItem("IM_LOCALE", locale);
export const setSendAction = (action: string) =>
  localStorage.setItem("IM_SEND_ACTION", action);

// 记住密码功能
export const setRememberAccountCredentials = (account: string, password: string) => {
  localStorage.setItem("IM_REMEMBER_ACCOUNT", account);
  localStorage.setItem("IM_REMEMBER_ACCOUNT_PASSWORD", encryptRememberPassword(password)); // 加密存储原始密码
};

export const setRememberEmailCredentials = (email: string, password: string) => {
  localStorage.setItem("IM_REMEMBER_EMAIL", email);
  localStorage.setItem("IM_REMEMBER_EMAIL_PASSWORD", encryptRememberPassword(password)); // 加密存储原始密码
};

export const clearRememberCredentials = () => {
  localStorage.removeItem("IM_REMEMBER_ACCOUNT");
  localStorage.removeItem("IM_REMEMBER_ACCOUNT_PASSWORD");
  localStorage.removeItem("IM_REMEMBER_EMAIL");
  localStorage.removeItem("IM_REMEMBER_EMAIL_PASSWORD");
};

// 清除所有用户数据（包括记住的凭据）
export const clearAllUserData = () => {
  clearIMProfile();
  clearRememberCredentials();
};

export const clearIMProfile = () => {
  localForage.removeItem("IM_TOKEN");
  localForage.removeItem("IM_CHAT_TOKEN");
  localForage.removeItem("IM_USERID");
  localStorage.removeItem("walletExist");
  localStorage.removeItem("AES_KEY");
  localStorage.removeItem("rsaPrivateKey");
  localStorage.removeItem("IM_PHONE_NUM");
  localStorage.removeItem("IM_EMAIL");
  // 注意：不清除记住的凭据，让用户下次登录时仍可使用
};

export const getAreaCode = () => localStorage.getItem("IM_AREA_CODE");
export const getPhoneNumber = () => localStorage.getItem("IM_PHONE_NUM");
export const getEmail = () => localStorage.getItem("IM_EMAIL");
export const getLoginMethod = () =>
  (localStorage.getItem("IM_LOGIN_METHOD") ?? "email") as "phone" | "email";
export const getIMToken = async () => await localForage.getItem("IM_TOKEN");
export const getChatToken = async () => await localForage.getItem("IM_CHAT_TOKEN");
export const getIMUserID = async () => await localForage.getItem("IM_USERID");
export const getAccessedFriendApplication = async () =>
  (await localForage.getItem<string[]>(
    `${await getIMUserID()}_accessedFriendApplications`,
  )) ?? [];
export const getAccessedGroupApplication = async () =>
  (await localForage.getItem<string[]>(
    `${await getIMUserID()}_accessedGroupApplications`,
  )) ?? [];
export const getUserCustomEmojis = async (): Promise<CustomEmojiItem[]> =>
  (await localForage.getItem(`${await getIMUserID()}_customEmojis`)) ?? [];

export const getLocale = (): LocaleString =>
  window.electronAPI?.ipcSendSync("getKeyStoreSync", { key: "language" }) ||
  (localStorage.getItem("IM_LOCALE") as LocaleString) ||
  window.navigator.language ||
  "en-US";
export const getSendAction = () =>
  (localStorage.getItem("IM_SEND_ACTION") as SendAction) || "enter";

// 获取记住的凭据
export const getRememberAccountCredentials = () => {
  const encryptedPassword = localStorage.getItem("IM_REMEMBER_ACCOUNT_PASSWORD") || "";
  return {
    account: localStorage.getItem("IM_REMEMBER_ACCOUNT") || "",
    password: encryptedPassword ? decryptRememberPassword(encryptedPassword) : "",
  };
};

export const getRememberEmailCredentials = () => {
  const encryptedPassword = localStorage.getItem("IM_REMEMBER_EMAIL_PASSWORD") || "";
  return {
    email: localStorage.getItem("IM_REMEMBER_EMAIL") || "",
    password: encryptedPassword ? decryptRememberPassword(encryptedPassword) : "",
  };
};
