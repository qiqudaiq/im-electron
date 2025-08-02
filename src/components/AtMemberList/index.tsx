import { GroupMemberItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { GroupMemberRole } from "@openim/wasm-client-sdk";
import { Spin } from "antd";
import { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { t } from "i18next";

import OIMAvatar from "@/components/OIMAvatar";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers from "@/hooks/useGroupMembers";

import "./styles.scss";

interface AtMemberListProps {
  visible: boolean;
  keyword: string;
  onSelect: (member: GroupMemberItem | { userID: string; nickname: string }) => void;
}

const AtMemberList: React.FC<AtMemberListProps> = ({ visible, keyword, onSelect }) => {
  const { isOwner, isAdmin, currentMemberInGroup } = useCurrentMemberRole();
  const { fetchState, getMemberData, searchMember, resetState } = useGroupMembers();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && currentMemberInGroup?.groupID) {
      setLoading(true);
      getMemberData(true).finally(() => {
        setLoading(false);
      });
    }
    return () => {
      resetState();
    };
  }, [visible, currentMemberInGroup?.groupID]);

  useEffect(() => {
    if (visible && keyword) {
      setLoading(true);
      searchMember(keyword).finally(() => {
        setLoading(false);
      });
    }
  }, [visible, keyword]);

  const isShowAtAll = isOwner || isAdmin;
  // const dataSource = keyword ? fetchState.searchMemberList : fetchState.groupMemberList;
  const dataSource = [{ faceURL: "", nickname: "贝贝" }];

  const handleClick = (member: GroupMemberItem) => {
    onSelect(member);
  };

  const handleClickAtAll = () => {
    onSelect({ userID: "all", nickname: t("placeholder.allMembers") });
  };

  if (!visible) return null;

  return (
    // <div className="at-member-list">
    //   <Spin spinning={loading}>
    //     <Virtuoso
    //       className="at-member-list-content"
    //       data={dataSource}
    //       itemContent={(_, member) => (
    //         <div className="at-member-item" onClick={() => handleClick(member)}>
    //           <OIMAvatar src={member.faceURL} text={member.nickname} size={32} />
    //           <div className="at-member-nickname">{member.nickname}</div>
    //         </div>
    //       )}
    //       components={{
    //         Header: () =>
    //           isShowAtAll ? (
    //             <div className="at-member-item at-all-item" onClick={handleClickAtAll}>
    //               <div className="at-all-avatar">@</div>
    //               <div className="at-member-nickname">
    //                 {t("placeholder.allMembers")}
    //               </div>
    //             </div>
    //           ) : null,
    //       }}
    //     />
    //   </Spin>
    // </div>

    <div style={{ width: 100, height: 100, backgroundColor: "pink" }}>6666</div>
  );
};

export default AtMemberList;
