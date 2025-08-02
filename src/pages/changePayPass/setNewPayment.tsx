import { Button, Form, Input, Modal, QRCode, Select, Space, Tabs, message } from "antd";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLogin, useSendSms, initWallet, changePaymentPassword } from "@/api/login";
import {
  getEmail,
  getPhoneNumber,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
} from "@/utils/storage";
import { handleEncryption } from "@/utils/jsencrypt";

export const SetNewPaymentPasswordForm = ({ openWallet, close }: any) => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    const { newPaymentPassword, oldPaymentPassword } = values;
    const cryptNewPassword = handleEncryption(newPaymentPassword);
    const cryptOldPassword = md5(oldPaymentPassword);
    return;
    try {
      const { errCode, data } = await changePaymentPassword();
      if (errCode === 0) {
        message.success("success");
        close();
        openWallet();
      }
    } catch (error) {
      console.log(error);
    }
    // close();
    // openWallet();
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ prefixCls: "custom-form-item" }}
      >
        <>
          {/* 支付密码字段 */}
          <Form.Item
            label={t("placeholder.oldPaymentPassword")}
            name="oldPaymentPassword"
            rules={[
              {
                required: true,
                pattern: /^\d{6}$/,
                message: t("toast.paymentPasswordRules"),
              },
            ]}
          >
            <Input.Password
              allowClear
              placeholder={t("placeholder.inputOldPaymentPassword")}
            />
          </Form.Item>

          {/* 确认支付密码字段 */}
          <Form.Item
            label={t("placeholder.newPaymentPassword")}
            name="newPaymentPassword"
            rules={[
              {
                required: true,
                pattern: /^\d{6}$/,
                message: t("toast.paymentPasswordRules"),
              },
            ]}
          >
            <Input.Password
              allowClear
              placeholder={t("placeholder.inputNewPaymentPassword")}
            />
          </Form.Item>
        </>
        <Form.Item className="mb-4">
          <Button type="primary" htmlType="submit" block>
            {t("placeholder.submit")}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
