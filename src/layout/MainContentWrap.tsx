import { getWithRenderProcess } from "@openim/electron-client-sdk/lib/render";
import { AllowType, getSDK, GroupMemberRole } from "@openim/wasm-client-sdk";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useConversationStore, useUserStore } from "@/store";
import { emit } from "@/utils/events";
import { checkNotificationPermission } from "@/utils/imCommon";
import { getIMToken, getIMUserID } from "@/utils/storage";

// 检测是否为Electron环境
const isElectron = Boolean(window.electronAPI);

// const isElectronProd = import.meta.env.MODE !== "development" && window.electronAPI;
// const { instance } = getWithRenderProcess();
const { instance } = getWithRenderProcess({
  wasmConfig: {
    coreWasmPath: import.meta.env.VITE_OPENIM_WASM_URL,
    sqlWasmPath: "/sql-wasm.wasm",
  },
});
const openIMSDK = instance;
export const wasmSDK = getSDK({
  coreWasmPath: import.meta.env.VITE_OPENIM_WASM_URL,
  sqlWasmPath: `/sql-wasm.wasm`,
  debug: true,
});

export const IMSDK: any = openIMSDK;
export const MainContentWrap = () => {
  const updateAppSettings = useUserStore((state) => state.updateAppSettings);
  const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loginCheck = async () => {
      const IMToken = await getIMToken();
      const IMUserID = await getIMUserID();

      // 修改登录检查逻辑：
      // 1. 在Electron环境中，直接跳转到登录页(除非已登录)
      // 2. 在Web环境中，只有当非首页且未登录时才跳转
      if (!IMToken || !IMUserID) {
        if (isElectron) {
          // Electron环境 - 直接跳转到登录页
          navigate("/login");
          return;
        }
        // Web环境 - 只有当不在首页和隐私页时才跳转 /account-delete
        if (
          location.pathname !== "/" &&
          location.pathname !== "/privacy" &&
          location.pathname !== "/lucky-wheel" &&
          location.pathname !== "/account-delete"
        ) {
          navigate("/login");
          return;
        }
      }
    };

    loginCheck();
  }, [location.pathname, navigate]);

  useEffect(() => {
    window.userClick = (userID?: string, groupID?: string) => {
      if (!userID || userID === "AtAllTag") return;

      const currentGroupInfo = useConversationStore.getState().currentGroupInfo;
      const currentUserInfo = useUserStore.getState().selfInfo;

      // 修改判断逻辑：根据新的数值权限系统
      if (groupID && currentGroupInfo?.lookMemberInfo !== undefined) {
        const permission = currentGroupInfo.lookMemberInfo;

        // 0: 允许任何人查看群成员资料 - 允许查看
        if (permission === 0) {
          // 继续执行，允许查看
        }
        // 1: 不允许查看其他群成员资料 - 禁止查看
        else if (permission === 1) {
          return;
        }
        // 2: 不允许查看群人数与群成员列表 - 这里主要影响成员列表，单个用户卡片可能还是可以查看
        else if (permission === 2) {
          // 对于单个用户点击，我们可能还是允许查看用户卡片，但不显示群成员相关信息
          // 这里暂时允许查看，具体限制在用户卡片组件中处理
        }
        // 3: 不允许管理员和普通用户查看群成员 - 只有群主可以查看
        else if (permission === 3) {
          // 获取当前用户在群中的角色信息
          const currentMemberInGroup =
            useConversationStore.getState().currentMemberInGroup;
          const isOwner = currentMemberInGroup?.roleLevel === GroupMemberRole.Owner;

          // 只有群主可以查看，管理员和普通用户都不能查看
          if (!isOwner) {
            return;
          }
        }
      }

      emit("OPEN_USER_CARD", {
        userID,
        groupID,
        isSelf: userID === useUserStore.getState().selfInfo.userID,
        notAdd:
          Boolean(groupID) &&
          currentGroupInfo?.applyMemberFriend === AllowType.NotAllowed,
      });
    };
  }, []);

  useEffect(() => {
    const initSettingStore = async () => {
      if (!window.electronAPI) return;
      updateAppSettings({
        closeAction:
          (await window.electronAPI?.ipcInvoke("getKeyStore", {
            key: "closeAction",
          })) || "miniSize",
      });
      window.electronAPI?.ipcInvoke("main-win-ready");
    };

    initSettingStore();
    checkNotificationPermission();
    // selectUserPermission()
  }, []);

  // const selectUserPermission = async () => {
  //   try {
  //       const res = await get_self_org_role_permission();
  //       const permissions = res.data.map(v=>v.permission_code);
  //       updateSelfInfo({
  //         permissions,
  //       })
  //   } catch (e) {
  //       console.log(e);
  //   }
  // }
  return <Outlet />;
};
