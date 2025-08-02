import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { CheckOutlined } from "@ant-design/icons";
import { t } from "i18next";
import { AllowType } from "@openim/wasm-client-sdk";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";
import { Spin } from "antd";

const SetgroupMemberPermission = () => {
  const [loading, setLoading] = useState(false);

  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const [lookMemberInfoStatus, setLookMemberInfoStatus] = useState<
    AllowType | undefined
  >(currentGroupInfo?.lookMemberInfo);
  const [applyMemberFriendStatus, setApplyMemberFriendStatus] = useState<
    AllowType | undefined
  >(currentGroupInfo?.applyMemberFriend);

  useEffect(() => {
    if (currentGroupInfo) {
      setLookMemberInfoStatus(currentGroupInfo.lookMemberInfo);
      setApplyMemberFriendStatus(currentGroupInfo.applyMemberFriend);
    }
  }, [currentGroupInfo]);

  const handleOptionClick = async (option: any) => {
    if (!currentGroupInfo) return;
    setLoading(true);
    try {
      let value;
      if (option.key === "lookMemberInfo") {
        value = option.value;
      } else {
        value =
          applyMemberFriendStatus === option.value
            ? AllowType.Allowed
            : AllowType.NotAllowed;
      }

      await IMSDK.setGroupInfo({
        groupID: currentGroupInfo.groupID,
        lookMemberInfo: option.key === "lookMemberInfo" ? value : undefined,
        applyMemberFriend: option.key === "applyMemberFriend" ? value : undefined,
      });
      setLoading(false);
      // 更新本地状态
      if (option.key === "lookMemberInfo") {
        setLookMemberInfoStatus(value);
      } else if (option.key === "applyMemberFriend") {
        setApplyMemberFriendStatus(value);
      }
    } catch (error) {
      setLoading(false);
      feedbackToast({ error, msg: t("toast.updateGroupInfoFailed") });
    }
  };

  const muteOptions: any[] = [
    {
      key: "applyMemberFriend",
      value: AllowType.NotAllowed,
      label: t("placeholder.forbidAddMember"),
    },
  ];

  const lookMemberInfoOptions: any[] = [
    {
      key: "lookMemberInfo",
      value: 0,
      label: t("placeholder.allowAnyoneLookMemberInfo"),
    },
    {
      key: "lookMemberInfo",
      value: 1,
      label: t("placeholder.forbidLookMemberInfo"),
    },
    {
      key: "lookMemberInfo",
      value: 2,
      label: t("placeholder.forbidLookMemberList"),
    },
    {
      key: "lookMemberInfo",
      value: 3,
      label: t("placeholder.forbidAdminLookMember"),
    },
  ];

  const getOptionStatus = (option: any) => {
    if (option.key === "lookMemberInfo") {
      if (lookMemberInfoStatus === 3) {
        return option.value === 3 || option.value === 2 || option.value === 1;
      }
      if (lookMemberInfoStatus === 2) {
        return option.value === 2 || option.value === 1;
      }
      return lookMemberInfoStatus === option.value;
    } else if (option.key === "applyMemberFriend") {
      return applyMemberFriendStatus === option.value;
    }
    return false;
  };

  return (
    <>
      <Spin spinning={loading}>
        <div className="py-2">
          {/* 群成员查看权限选项 */}
          <div className="px-4 py-2 text-sm font-medium text-gray-600">
            {t("placeholder.groupMemberPermission")}
          </div>
          {lookMemberInfoOptions.map((option) => (
            <div
              key={`${option.key}-${option.value}`}
              className={clsx(
                "flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[#f5f5f5]",
              )}
              onClick={() => handleOptionClick(option)}
            >
              <div className="flex items-center">
                <span>{option.label}</span>
              </div>
              <CheckOutlined
                className="text-[#0289FA]"
                rev={undefined}
                style={{
                  marginLeft: 30,
                  visibility: getOptionStatus(option) ? "visible" : "hidden",
                }}
              />
            </div>
          ))}
          
          {/* 其他权限选项 */}
          <div className="px-4 py-2 text-sm font-medium text-gray-600 mt-4">
            {t("placeholder.otherPermissions")}
          </div>
          {muteOptions.map((option) => (
            <div
              key={option.key}
              className={clsx(
                "flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[#f5f5f5]",
              )}
              onClick={() => handleOptionClick(option)}
            >
              <div className="flex items-center">
                <span>{option.label}</span>
              </div>
              <CheckOutlined
                className="text-[#0289FA]"
                rev={undefined}
                style={{
                  marginLeft: 30,
                  visibility: getOptionStatus(option) ? "visible" : "hidden",
                }}
              />
            </div>
          ))}
        </div>
      </Spin>
    </>
  );
};

export default SetgroupMemberPermission;
