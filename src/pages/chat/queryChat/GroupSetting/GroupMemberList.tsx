import { GroupMemberRole } from "@openim/wasm-client-sdk";
import { GroupMemberItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { Button, Empty, message, Spin, Tooltip } from "antd";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Virtuoso } from "react-virtuoso";

import OIMAvatar from "@/components/OIMAvatar";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers, { REACH_SEARCH_FLAG } from "@/hooks/useGroupMembers";
import { useUserStore } from "@/store";

import styles from "./group-setting.module.scss";
import {
  AudioMutedOutlined,
  AudioOutlined,
  DeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { IMSDK } from "@/layout/MainContentWrap";
import GroupMuteSetting from "./GroupMuteSetting";

export interface GroupMemberListHandle {
  searchMember: (keyword: string) => void;
}

interface IGroupMemberListProps {
  isSearching: boolean;
}

const GroupMemberList: ForwardRefRenderFunction<
  GroupMemberListHandle,
  IGroupMemberListProps
> = ({ isSearching }, ref) => {
  const selfUserID = useUserStore((state) => state.selfInfo.userID);
  const { currentMemberInGroup } = useCurrentMemberRole();
  const { fetchState, getMemberData, searchMember, resetState } = useGroupMembers();

  useEffect(() => {
    if (currentMemberInGroup?.groupID) {
      getMemberData(true);
    }
    return () => {
      resetState();
    };
  }, [currentMemberInGroup?.groupID]);

  useImperativeHandle(ref, () => ({
    searchMember,
  }));

  const endReached = () => {
    if (!isSearching) {
      getMemberData();
    } else {
      searchMember(REACH_SEARCH_FLAG);
    }
  };

  const dataSource = isSearching
    ? fetchState.searchMemberList
    : fetchState.groupMemberList;

  return (
    <div className="h-full px-2 py-2.5">
      {isSearching && dataSource.length === 0 ? (
        <Empty
          className="flex h-full flex-col items-center justify-center"
          description={t("empty.noSearchResults")}
        />
      ) : (
        <Virtuoso
          className="h-full overflow-x-hidden"
          data={dataSource}
          endReached={endReached}
          components={{
            Header: () => (fetchState.loading ? <Spin /> : null),
          }}
          itemContent={(_, member) => (
            <MemberItem member={member} selfUserID={selfUserID} />
          )}
        />
      )}
    </div>
  );
};

export default forwardRef(GroupMemberList);

interface IMemberItemProps {
  member: GroupMemberItem;
  selfUserID: string;
}

const MemberItem = memo(({ member }: IMemberItemProps) => {
  const { currentMemberInGroup } = useCurrentMemberRole();
  // 判断当前登录用户的角色
  const isSelfOwner = currentMemberInGroup?.roleLevel === GroupMemberRole.Owner;
  const isSelfAdmin = currentMemberInGroup?.roleLevel === GroupMemberRole.Admin;

  const isOwner = member.roleLevel === GroupMemberRole.Owner;
  const isAdmin = member.roleLevel === GroupMemberRole.Admin;
  const isTargetSelf = member.userID === currentMemberInGroup?.userID;
  const isMuted = (member.muteEndTime ?? 0) > Date.now();

  // 权限判断函数
  const canSetAdmin = isSelfOwner && !isOwner && !isTargetSelf;
  const canMute =
    (isSelfOwner || isSelfAdmin) &&
    !isOwner &&
    !isTargetSelf &&
    !(isSelfAdmin && isAdmin);
  const canKick =
    (isSelfOwner || isSelfAdmin) &&
    !isOwner &&
    !isTargetSelf &&
    !(isSelfAdmin && isAdmin);

  const [isLoading, setIsLoading] = useState(false);
  const [muteModalVisible, setMuteModalVisible] = useState(false);

  const setGroupAdmin = async () => {
    setIsLoading(true);
    try {
      const res = await IMSDK.setGroupMemberInfo({
        groupID: member.groupID,
        userID: member.userID,
        roleLevel: isAdmin ? GroupMemberRole.Normal : GroupMemberRole.Admin,
      });
      if (res.data !== undefined) {
        setIsLoading(false);
      }
    } catch (error) {
      message.warning(t("toast.accessFailed"));
      setIsLoading(false);
    }
    return;
  };

  const openMuteModal = () => {
    if (!canMute) return;
    setMuteModalVisible(true);
  };

  const closeMuteModal = () => {
    setMuteModalVisible(false);
  };

  const kickMember = async () => {
    if (!canKick) return;
    setIsLoading(true);
    try {
      await IMSDK.kickGroupMember({
        groupID: member.groupID,
        userIDList: [member.userID],
        reason: "被管理员移出群聊",
      });
      message.success(t("toast.accessSuccess"));
    } catch (error) {
      message.error(t("toast.accessFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Spin spinning={isLoading}>
      <div className={styles["list-member-item"]}>
        <div
          className="flex items-center overflow-hidden"
          onClick={() => window.userClick(member.userID, member.groupID)}
        >
          <OIMAvatar src={member.faceURL} text={member.nickname} />
          <div className="ml-3 flex items-center">
            <div className="max-w-[120px] truncate">{member.nickname}</div>
            {isOwner && (
              <span className="ml-2 rounded border border-[#FF9831] px-1 text-xs text-[#FF9831]">
                {t("placeholder.groupOwner")}
              </span>
            )}
            {isAdmin && (
              <span className="ml-2 rounded border border-[#0289FA] px-1 text-xs text-[#0289FA]">
                {t("placeholder.administrator")}
              </span>
            )}
          </div>
        </div>
        {(canSetAdmin || canMute || canKick) && (
          <div className={styles["tools-row"]} style={{ gap: 10 }}>
            {canMute && (
              <Tooltip title={t('placeholder.Mute')}>
                <Button
                  icon={
                    <AudioMutedOutlined style={isMuted ? { color: "#0289FA" } : {}} />
                  }
                  type={"default"}
                  size="small"
                  onClick={openMuteModal}
                />
              </Tooltip>
            )}
            {canSetAdmin && (
              <Tooltip title={isAdmin ? t('placeholder.RemoveAdmin') : t('placeholder.SetAdmin')}>
                <Button
                  type={"default"}
                  color="pink"
                  icon={<UserOutlined style={isAdmin ? { color: "#0289FA" } : {}} />}
                  onClick={setGroupAdmin}
                  size="small"
                />
              </Tooltip>
            )}
            {canKick && (
              <Tooltip title={t('placeholder.RemoveFromGroup')}>
                <Button
                  type="default"
                  icon={<DeleteOutlined style={{ color: "red" }} />}
                  size="small"
                  onClick={kickMember}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>
      <GroupMuteSetting
        open={muteModalVisible}
        onClose={closeMuteModal}
        groupID={member.groupID}
        userID={member.userID}
        isMuted={isMuted}
      />
    </Spin>
  );
});
