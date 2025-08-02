import { PlusOutlined, RightOutlined } from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Layout,
  message,
  Popconfirm,
  Popover,
  Space,
  Tooltip,
  Upload,
} from "antd";
import clsx from "clsx";
import i18n, { t } from "i18next";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import ImageResizer from "react-image-file-resizer";
import { UNSAFE_NavigationContext, useResolvedPath } from "react-router-dom";
import { useCopyToClipboard } from "react-use";

import { modal } from "@/AntdGlobalComp";
import { changeOrg, selectAllOrg, updateBusinessUserInfo } from "@/api/login";
import live_icon from "@/assets/images/live/live_icon.png";
import live_icon_active from "@/assets/images/live/live_icon_active.png";
import contact_icon from "@/assets/images/nav/nav_bar_contact.png";
import contact_icon_active from "@/assets/images/nav/nav_bar_contact_active.png";
import message_icon from "@/assets/images/nav/nav_bar_message.png";
import message_icon_active from "@/assets/images/nav/nav_bar_message_active.png";
import change_avatar from "@/assets/images/profile/change_avatar.png";
import OIMAvatar from "@/components/OIMAvatar";
import JoinOrgModal from "@/layout/LeftNavBar/JoinOrgModal";
import { useContactStore, useConversationStore, useUserStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { aesEncrypt } from "@/utils/crypto";
import { emit } from "@/utils/events";
import { encodeFile, uploadFile } from "@/utils/imCommon";
import {
  getChatToken,
  getLoginMethod,
  setIMProfile,
  setLoginMethod as saveLoginMethod,
} from "@/utils/storage";

import { OverlayVisibleHandle } from "../../hooks/useOverlayVisible";
import About from "./About";
import ConversationNavMenuContent from "./ConversationNavMenuContent";
import styles from "./left-nav-bar.module.scss";
import PersonalSettings from "./PersonalSettings";
import WalletVerifyForm from "./VerifyForWallet";
import Wallet from "./Wallet";
import CheckIn from "@/components/CheckIn";
import TicketsModal from "@/pages/tickets";
import LuckyWheel from "@/components/LuckyWheel";
import { FILE_SIZE_LIMITS, FILE_SIZE_LIMITS_TEXT } from "@/constants/im";
import { IMSDK } from "../MainContentWrap";

const { Sider } = Layout;

const NavList = [
  {
    icon: message_icon,
    icon_active: message_icon_active,
    title: t("placeholder.chat"),
    path: "/chat",
  },
  {
    icon: contact_icon,
    icon_active: contact_icon_active,
    title: t("placeholder.contact"),
    path: "/contact",
  },
  {
    icon: live_icon,
    icon_active: live_icon_active,
    title: t("placeholder.live"),
    path: "/live",
  },
];

i18n.on("languageChanged", () => {
  NavList[0].title = t("placeholder.chat");
  NavList[1].title = t("placeholder.contact");
  NavList[2].title = t("placeholder.live");
});

const resizeFile = (file: File): Promise<File> =>
  new Promise((resolve) => {
    ImageResizer.imageFileResizer(
      file,
      400,
      400,
      "webp",
      90,
      0,
      (uri) => {
        resolve(uri as File);
      },
      "file",
    );
  });

type NavItemType = (typeof NavList)[0];

const current_org_id = localStorage.getItem("current_org_id");

const NavItem = ({ nav: { icon, icon_active, title, path } }: { nav: NavItemType }) => {
  const selfInfo = useUserStore((state) => state.selfInfo);
  const resolvedPath = useResolvedPath(path);
  const { navigator } = React.useContext(UNSAFE_NavigationContext);
  const toPathname = navigator.encodeLocation
    ? navigator.encodeLocation(path).pathname
    : resolvedPath.pathname;
  const locationPathname = location.pathname;
  const isActive =
    locationPathname === toPathname ||
    (locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(toPathname.length) === "/") ||
    location.hash.startsWith(`#${toPathname}`);

  const [showConversationMenu, setShowConversationMenu] = useState(false);

  const unReadCount = useConversationStore((state) => state.unReadCount);
  const unHandleFriendApplicationCount = useContactStore(
    (state) => state.unHandleFriendApplicationCount,
  );
  const unHandleGroupApplicationCount = useContactStore(
    (state) => state.unHandleGroupApplicationCount,
  );

  const tryNavigate = () => {
    if (isActive) {
      return;
    }
    if (path === "/live") {
      // message.info("直播功能开发中");
      // return
      if (window.electronAPI) {
        window.electronAPI
          .openNewWindow({
            url: "/#/live",
            width: 1600,
            height: 1000,
          })
          .catch((err) => {
            console.error("Failed to open new window:", err);
          });
      } else {
        const liveUrl = `${window.location.origin}/#/live`;
        window.open(liveUrl, "_blank");
      }
      return;
    }
    navigator.push(path);
  };

  const closeConversationMenu = () => {
    setShowConversationMenu(false);
  };

  const getBadge = () => {
    if (path === "/chat") {
      return unReadCount;
    }
    if (path === "/contact") {
      return unHandleFriendApplicationCount + unHandleGroupApplicationCount;
    }
    return 0;
  };

  return (
    <Badge size="small" count={getBadge()}>
      <Popover
        overlayClassName="conversation-popover"
        placement="bottomRight"
        title={null}
        arrow={false}
        open={path === "/chat" ? showConversationMenu : false}
        onOpenChange={(vis) => setShowConversationMenu(vis)}
        content={
          <ConversationNavMenuContent closeConversationMenu={closeConversationMenu} />
        }
        trigger="contextMenu"
      >
        <div
          className={clsx(
            "mb-3 flex h-[52px] w-12 cursor-pointer flex-col items-center justify-center rounded-md",
            { "bg-[#e9e9eb]": isActive },
          )}
          onClick={tryNavigate}
        >
          <img width={20} src={isActive ? icon_active : icon} alt="" />
          <div className="mt-1 text-xs text-gray-500">{title}</div>
        </div>
      </Popover>
    </Badge>
  );
};

const profileMenuList = [
  {
    title: t("placeholder.myInfo"),
    gap: true,
    idx: 0,
  },
  {
    title: t("placeholder.wallet"),
    gap: true,
    idx: 1,
  },
  {
    title: t("placeholder.myTickets"),
    gap: true,
    idx: 2,
    isShowType:'lottery'
  },

  // {
  //   title: t("placeholder.prizeList"),
  //   gap: true,
  //   idx: 3,
  //   isShowType:'lottery'
  // },
  {
    title: t("placeholder.accountSetting"),
    gap: true,
    idx: 3,
  },
  {
    title: t("placeholder.logOut"),
    gap: false,
    idx: 4,
  },
];

i18n.on("languageChanged", () => {
  profileMenuList[0].title = t("placeholder.myInfo");
  profileMenuList[1].title = t("placeholder.wallet");
  profileMenuList[2].title = t("placeholder.myTickets");
  // profileMenuList[3].title = t("placeholder.prizeList");
  profileMenuList[3].title = t("placeholder.accountSetting");
  profileMenuList[4].title = t("placeholder.logOut");
});

const LeftNavBar = memo(() => {
  const aboutRef = useRef<OverlayVisibleHandle>(null);
  const walletRef = useRef<OverlayVisibleHandle>(null);
  const personalSettingsRef = useRef<OverlayVisibleHandle>(null);
  const changePaymentPasswordRef = useRef<OverlayVisibleHandle>(null);
  const ticketsRef = useRef<OverlayVisibleHandle>(null);
  const luckyWheelRef = useRef<OverlayVisibleHandle>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [orgList, setOrgList] = useState([]);
  const [joinOrgModalVisible, setJoinOrgModalVisible] = useState(false);
  const selfInfo = useUserStore((state) => state.selfInfo);
  const isWalletOpened = useUserStore((state) => state.isWalletOpened);
  const userLogout = useUserStore((state) => state.userLogout);
  const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const [loginMethod, setLoginMethod] = useState<"phone" | "email">(getLoginMethod());

  const [_, copyToClipboard] = useCopyToClipboard();

  const [currentOrgId, setCurrentOrgId] = useState(localStorage.getItem("current_org_id"));
  
  // locale re render - 监听语言变化以触发重新渲染
  useUserStore((state) => state.appSettings.locale);
  
  useEffect(() => {
    initOrg();
  }, [joinOrgModalVisible, currentOrgId]);

  const initOrg = async () => {
    const chatToken = await getChatToken();
    if (!chatToken) {
      return;
    }

    if (!joinOrgModalVisible) {

      selectAllOrg().then((res) => {
        const allOrg = res.data.data;
        const orgIds = allOrg.map(org => org.organization.id);
        
        // 如果当前组织ID不在可用组织列表中，切换到第一个可用组织
        if (!currentOrgId || !orgIds.includes(currentOrgId)) {
          if (allOrg.length > 0) {
            const firstOrg = allOrg[0];
            switchOrg(firstOrg.organization.id, firstOrg.role);
          }
        }
        
        const tmpList = allOrg.map((v) => {
          return {
            name: v.organization.name,
            id: v.organization.id,
            logo: v.organization.logo,
            role: v.role,
          };
        });
        setOrgList(tmpList);
      });
    }
  }

  const updateLoginMethod = useCallback((method: "phone" | "email") => {
    setLoginMethod(method);
    saveLoginMethod(method);
  }, []);

  const walletModalClose = () => {
    setWalletModalOpen(false);
  };

  const profileMenuClick = async (idx: number) => {
    switch (idx) {
      case 0:
        emit("OPEN_USER_CARD", {
          isSelf: true,
          userID: useUserStore.getState().selfInfo.userID,
        });
        break;
      case 1:
        setShowProfile(false);
        const walletExist = localStorage.getItem("walletExist");
        if (walletExist !== "true") {
          modal.confirm({
            title: t("placeholder.hint"),
            content: t("toast.toCreateWallet"),
            onOk: async () => {
              changePaymentPasswordRef.current?.openOverlay();
            },
            onCancel: () => {
              return;
            },
          });
        } else {
          walletRef.current?.openOverlay();
        }
        break;
      case 2:
        setShowProfile(false);
        ticketsRef.current?.openOverlay();
        break;

      // case 3:
      //   setShowProfile(false);
      //   setIsPrizesModalOpen(true);
      //   break;
      case 3:
        personalSettingsRef.current?.openOverlay();
        break;
      case 4:
        tryLogout();
        break;
      default:
        break;
    }
    setShowProfile(false);
  };

  const tryLogout = () => {
    modal.confirm({
      title: t("placeholder.logOut"),
      content: t("toast.confirmlogOut"),
      onOk: async () => {
        try {
          await userLogout();
        } catch (error) {
          // feedbackToast({ error });
        }
      },
    });
  };

  const customUpload = async ({ file }: { file: File }) => {
    if (file.size > FILE_SIZE_LIMITS.IMAGE) {
      message.error(t('toast.fileSizeLimit', { size: FILE_SIZE_LIMITS_TEXT.IMAGE }));
      return;
    }

    const resizedFile = await resizeFile(file);
    const filePath = await window.electronAPI?.saveFileToDisk({
      sync: true,
      file,
    });
    // console.log("test_file filePath: ", filePath);
    // const res = await encodeFile(resizedFile, filePath);
    // console.log("test_file res: ", res);
    // return;
    try {
      const {
        data: { url },
      } = await uploadFile(resizedFile, filePath);
      const newInfo = {
        faceURL: url,
      };
      await updateBusinessUserInfo(newInfo);
      updateSelfInfo(newInfo);
    } catch (error) {
      // feedbackToast({ error: t("toast.updateAvatarFailed") });
    }
  };

  
  const ProfileContent = (
    <div className="w-72 px-2.5 pb-3 pt-5.5">
      <div className="mx-3 mb-4.5 flex items-center">
        <Upload
          accept=".jpeg,.png,.webp"
          showUploadList={false}
          customRequest={customUpload as any}
        >
          <div className={styles["avatar-wrapper"]}>
            <OIMAvatar src={selfInfo.faceURL} text={selfInfo.nickname} />
            <div className={styles["mask"]}>
              <img src={change_avatar} width={19} alt="" />
            </div>
          </div>
        </Upload>
        <div className="flex-1 overflow-hidden">
          <div className="mb-1 truncate text-base font-medium">{selfInfo.nickname}</div>
        </div>

        {selfInfo?.permissions?.includes("checkin") && (
          <div>
            <CheckIn />
          </div>
        )}
      </div>
      {profileMenuList.map((menu) => {
        if(menu?.isShowType&&!(selfInfo?.permissions?.includes(menu?.isShowType))){
          return null
        }
        return(

        <div key={menu.idx}>
          <div
            className="flex cursor-pointer items-center justify-between rounded-md px-3 py-4 hover:bg-[var(--primary-active)]"
            onClick={() => profileMenuClick(menu.idx)}
          >
            <div>{menu.title}</div>
            <RightOutlined rev={undefined} />
          </div>
          {menu.gap && (
            <div className="px-3">
              <Divider className="my-1.5 border-[var(--gap-text)]" />
            </div>
          )}
        </div>
      )})}
    </div>
  );
  const joinOrg = () => {
    setJoinOrgModalVisible(true);
  };
  const switchOrg = async (id: string, role: string) => {
    const chatToken = (await getChatToken()) as string;
    try {
      const imres = await changeOrg(chatToken, id);
      localStorage.setItem("current_org_id", id);
      localStorage.setItem("current_org_role", role);
      setCurrentOrgId(id); // 更新状态
      const { im_token, im_server_user_id } = imres.data;
      setIMProfile({ chatToken, imToken: im_token, userID: im_server_user_id });
      message.success(t("placeholder.SwitchSuccessRefresh"), 1).then(async () => {
        // 方案一：刷新前先登出
        try {
          await IMSDK.logout();
        } catch (e) {
          console.warn('IMSDK.logout() 失败', e);
        }
        window.location.reload();
      });
    } catch (e) {
      // message.error(e);
    }
  };

  

  const orgIcon = (org) => {
    if (org.name.length > 2) {
      return (
        <Tooltip title={org.name}>
          <Avatar
            size="large"
            shape="square"
            style={{
              cursor: "pointer",
              border: currentOrgId === org.id ? "2px solid #6ebdf5" : "",
            }}
            src={org.logo}
          >
            {org.name.substring(0, 2)}
          </Avatar>
        </Tooltip>
      );
    }
    return (
      <Avatar
        size="large"
        shape="square"
        style={{
          cursor: "pointer",
          border: currentOrgId === org.id ? "2px solid #6ebdf5" : "",
        }}
      >
        {org.name}
      </Avatar>
    );
  };

  return (
    <Sider
      className="no-mobile border-r border-gray-200 !bg-[#F4F4F4] dark:border-gray-800 dark:!bg-[#141414]"
      width={60}
      theme="light"
    >
      <div className="mt-6 flex flex-col items-center">
        <Popover
          content={ProfileContent}
          trigger="click"
          placement="rightBottom"
          overlayClassName="profile-popover"
          title={null}
          arrow={false}
          open={showProfile}
          onOpenChange={(vis) => setShowProfile(vis)}
        >
          <OIMAvatar
            className="mb-6 cursor-pointer"
            src={selfInfo.faceURL}
            text={selfInfo.nickname}
          />
        </Popover>

        {NavList.map((nav) => (
          <NavItem nav={nav} key={nav.path} />
        ))}
      </div>
      <Space
        direction="vertical"
        style={{ position: "absolute", bottom: 70, width: "100%", padding: "0 10px" }}
      >
        {orgList.map((org) => (
          <Popconfirm
            key={org?.id}
            title="操作提醒"
            description={<div style={{ padding: 10 }}>是否要切换到{org.name}</div>}
            onConfirm={() => switchOrg(org.id, org.role)}
            okText="确认"
            cancelText="取消"
            disabled={currentOrgId === org.id}
          >
            {orgIcon(org)}
          </Popconfirm>
        ))}
        <PlusOutlined
          style={{ cursor: "pointer", fontSize: 40, color: "#b7b7b7" }}
          onClick={joinOrg}
        />
      </Space>
      <PersonalSettings ref={personalSettingsRef} aboutRef={aboutRef} />
      <About ref={aboutRef} />
      <Wallet ref={walletRef} />
      <WalletVerifyForm
        loginMethod={loginMethod}
        updateLoginMethod={updateLoginMethod}
        openWallet={walletRef.current?.openOverlay}
        ref={changePaymentPasswordRef}
      />
      <JoinOrgModal
        joinOrgModalVisible={joinOrgModalVisible}
        setJoinOrgModalVisible={setJoinOrgModalVisible}
      />
      <TicketsModal ref={ticketsRef} />

     
    </Sider>
  );
});

export default LeftNavBar;
