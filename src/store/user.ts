import { t } from "i18next";
import { create } from "zustand";

import { BusinessUserInfo, getBusinessUserInfo } from "@/api/login";
import { IMSDK } from "@/layout/MainContentWrap";
import router from "@/routes";
import { feedbackToast } from "@/utils/common";
import { clearIMProfile, getLocale, setLocale } from "@/utils/storage";

import { useContactStore } from "./contact";
import { useConversationStore } from "./conversation";
import { AppSettings, IMConnectState, UserStore } from "./type";
import { get_self_org_role_permission } from '@/api/login';
import { getIMToken } from "@/utils/storage";

export const useUserStore = create<UserStore>()((set, get) => ({
  syncState: "success",
  progress: 0,
  reinstall: true,
  isLogining: false,
  connectState: "success",
  selfInfo: {} as BusinessUserInfo,
  isWalletOpened: false,
  appSettings: {
    locale: getLocale(),
    closeAction: "miniSize",
  },
  walletBalance: 0,
  updateSyncState: (syncState: IMConnectState) => {
    set({ syncState });
  },

  updateProgressState: (progress: number) => {
    set({ progress });
  },
  updateReinstallState: (reinstall: boolean) => {
    set({ reinstall });
  },
  updateIsLogining: (isLogining: boolean) => {
    set({ isLogining });
  },
  updateConnectState: (connectState: IMConnectState) => {
    set({ connectState });
  },
  getSelfInfoByReq: async () => {
    try {
      const IMToken = await getIMToken();
      if (!IMToken) {
        return false;
      }
      const { data: imData } = await IMSDK.getSelfUserInfo();
      set(() => ({ selfInfo: imData as unknown as BusinessUserInfo }));
      const { data: { users } } = await getBusinessUserInfo([imData.userID]);
      const { data: rolePermissions } = await get_self_org_role_permission();
      const permissions = rolePermissions.map(v => v.permission_code);
      users[0].permissions = permissions;
      set((state) => ({ selfInfo: { ...state.selfInfo, ...users[0] } }));
    } catch (error) {
      // feedbackToast({ error, msg: t("toast.getSelfInfoFailed") });
      get().userLogout();
    }


  },
  updateSelfInfo: (info: Partial<BusinessUserInfo>) => {
    set((state) => ({ selfInfo: { ...state.selfInfo, ...info } }));
  },
  updateAppSettings: (settings: Partial<AppSettings>) => {
    if (settings.locale) {
      setLocale(settings.locale);
    }
    set((state) => ({ appSettings: { ...state.appSettings, ...settings } }));
  },
  userLogout: async (force?: boolean) => {
    if (!force) await IMSDK.logout();
    clearIMProfile();
    set({ selfInfo: {} as BusinessUserInfo, progress: 0 });
    useContactStore.getState().clearContactStore();
    useConversationStore.getState().clearConversationStore();
    router.navigate("/login");
  },
}));
