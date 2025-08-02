import React, { useState, useEffect } from "react";
import clsx from "clsx";
import { Spin } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { t } from "i18next";
import { AllowType } from "@openim/wasm-client-sdk";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { feedbackToast } from "@/utils/common";

// 群验证选项枚举
enum GroupVerificationType {
  NeedInvitation = 0, // 群成员邀请无需验证
  NeedVerification = 1, // 需要发送验证消息
  AllowAnyoneJoin = 2, // 允许所有人加群
  ForbidAnyoneJoin = 3, // 不允许任何人加入
}

const SetGroupVerification = () => {
  const [loading, setLoading] = useState(false);
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);

  // 默认需要验证
  const [verificationType, setVerificationType] = useState<GroupVerificationType>(
    GroupVerificationType.NeedVerification,
  );

  useEffect(() => {
    if (currentGroupInfo) {
      // 从群信息中获取当前验证类型，如果后端返回的是needVerification字段
      // 这里假设后端返回的是一个名为joinApplicationType的字段，实际使用时需根据SDK定义调整
      const verificationValue = Number(currentGroupInfo.needVerification);
      setVerificationType(verificationValue as GroupVerificationType);
    }
  }, [currentGroupInfo]);

  const handleOptionClick = async (option: any) => {
    if (!currentGroupInfo) return;
    setLoading(true);
    try {
      await IMSDK.setGroupInfo({
        groupID: currentGroupInfo.groupID,
        needVerification: option.value,
      });
      setVerificationType(option.value);
      setLoading(false);
    } catch (error) {      
      setLoading(false);
    }
  };

  const verificationOptions = [
    {
      key: "noVerification",
      value: GroupVerificationType.NeedInvitation,
      label: t("placeholder.applyNeedInvite"),
    },
    {
      key: "needVerification",
      value: GroupVerificationType.NeedVerification,
      label: t("placeholder.applyNeedVerification"),
    },
    {
      key: "allowAnyoneJoin",
      value: GroupVerificationType.AllowAnyoneJoin,
      label: t("placeholder.applyAll"),
    },
    {
      key: "forbidAnyoneJoin",
      value: GroupVerificationType.ForbidAnyoneJoin,
      label: t("placeholder.forbidAnyoneJoin"),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className="py-2">
        {verificationOptions.map((option) => (
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
                visibility: verificationType === option.value ? "visible" : "hidden",
              }}
            />
          </div>
        ))}
      </div>
    </Spin>
  );
};

export default SetGroupVerification;
