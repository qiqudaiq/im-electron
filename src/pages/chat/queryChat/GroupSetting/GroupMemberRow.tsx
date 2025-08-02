import { GroupItem } from "@openim/wasm-client-sdk/lib/types/entity";
import clsx from "clsx";
import { t } from "i18next";
import { memo, useEffect } from "react";

import invite from "@/assets/images/chatSetting/invite.png";
import kick from "@/assets/images/chatSetting/kick.png";
import OIMAvatar from "@/components/OIMAvatar";
import useGroupMembers from "@/hooks/useGroupMembers";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import { emit } from "@/utils/events";
import styles from "./group-setting.module.scss";

const GroupMemberRow = ({
  currentGroupInfo,
  isNomal,
  updateTravel,
}: {
  currentGroupInfo: GroupItem;
  isNomal: boolean;
  updateTravel: () => void;
}) => {
  const { fetchState, getMemberData, resetState } = useGroupMembers();
  const { isOwner, isAdmin } = useCurrentMemberRole();
  
  useEffect(() => {
    if (currentGroupInfo?.groupID) {
      getMemberData(true);
    }
    return () => {
      resetState();
    };
  }, [currentGroupInfo?.groupID]);

  // 检查是否可以查看群成员信息
  const canViewMemberInfo = () => {
    const permission = currentGroupInfo?.lookMemberInfo;
    if (permission === undefined) return true; // 默认允许
    
    // 将permission转换为数值进行比较
    const permissionValue = Number(permission);
    
    switch (permissionValue) {
      case 0: // 允许任何人查看群成员资料
        return true;
      case 1: // 不允许查看其他群成员资料
        return false;
      case 2: // 不允许查看群人数与群成员列表
        return false;
      case 3: // 不允许管理员和普通用户查看群成员
        return isOwner; // 只有群主可以查看
      default:
        return true;
    }
  };

  const canViewMemberCount = () => {
    const permission = currentGroupInfo?.lookMemberInfo;
    if (permission === undefined) return true; // 默认允许
    
    // 将permission转换为数值进行比较
    const permissionValue = Number(permission);
    
    switch (permissionValue) {
      case 0: // 允许任何人查看群成员资料
        return true;
      case 1: // 不允许查看其他群成员资料
        return true; // 可以看数量，但不能看详细资料
      case 2: // 不允许查看群人数与群成员列表
        return false;
      case 3: // 不允许管理员和普通用户查看群成员
        return isOwner; // 只有群主可以查看
      default:
        return true;
    }
  };

  const sliceCount = isNomal ? 17 : 16;

  const inviteMember = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    emit("OPEN_CHOOSE_MODAL", {
      type: "INVITE_TO_GROUP",
      extraData: currentGroupInfo.groupID,
    });
  };

  const kickMember = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    emit("OPEN_CHOOSE_MODAL", {
      type: "KICK_FORM_GROUP",
      extraData: currentGroupInfo.groupID,
    });
  };

  return (
    <div className="p-4">
      {canViewMemberCount() && (
        <div className="mb-3 font-medium">
          <span>{t("placeholder.groupMember")}</span>
          <span className="ml-2">{currentGroupInfo?.memberCount}</span>
        </div>
      )}
      
      {canViewMemberInfo() && (
        <>
          <div className="flex flex-wrap items-center">
            {fetchState.groupMemberList.slice(0, sliceCount).map((member) => (
              <div
                key={member.userID}
                title={member.nickname}
                className={styles["member-item"]}
                onClick={() => window.userClick(member.userID, member.groupID)}
              >
                <OIMAvatar src={member.faceURL} text={member.nickname} size={36} />
                <div className="mt-2 min-h-[16px] max-w-full truncate text-xs">
                  {member.nickname}
                </div>
              </div>
            ))}
            <div
              className={clsx(styles["member-item"], "cursor-pointer")}
              onClick={inviteMember}
            >
              <img width={36} src={invite} alt="invite" />
              <div className="mt-2 max-w-full truncate text-xs text-[var(--sub-text)]">
                {t("placeholder.add")}
              </div>
            </div>
            {!isNomal && (
              <div
                className={clsx(styles["member-item"], "cursor-pointer")}
                onClick={kickMember}
              >
                <img width={36} src={kick} alt="kick" />
                <div className="mt-2 max-w-full truncate text-xs text-[var(--sub-text)]">
                  {t("placeholder.remove")}
                </div>
              </div>
            )}
          </div>
          <div
            className="flex cursor-pointer items-center justify-center pt-2 text-xs text-[var(--primary)]"
            onClick={updateTravel}
          >
            {t("placeholder.viewMore")}
          </div>
        </>
      )}
      
      {!canViewMemberInfo() && !canViewMemberCount() && (
        <div className="py-4 text-center text-gray-500">
          {t("placeholder.noPermissionToViewMembers")}
        </div>
      )}
    </div>
  );
};

export default memo(GroupMemberRow);
