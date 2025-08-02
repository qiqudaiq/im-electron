import { Button, Form, Input, Modal, QRCode, Select, Space, Tabs, message } from "antd";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLogin, useSendSms, initWallet } from "@/api/login";
import {
  getEmail,
  getPhoneNumber,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
} from "@/utils/storage";
import { aesEncrypt } from "@/utils/crypto";

export const SetPaymentPasswordForm = ({ openWallet, close }: any) => {
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    const params = {
      pay_pwd: values.paymentPassword,
    };
    const encryptParams = await aesEncrypt(JSON.stringify(params));
    const finalParams = {
      need_rsa_verify: false,
      encrypted_data: encryptParams,
    };
    try {
      const { errCode, data } = await initWallet(finalParams);
      if (errCode === 0) {
        message.success("success");
        localStorage.setItem("walletExist", "true");
        close();
        openWallet();
      }
    } catch (error) {
      console.error(error);
      close();
    }
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
            label={t("placeholder.paymentPassword")}
            name="paymentPassword"
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
              placeholder={t("placeholder.inputPaymentPassword")}
            />
          </Form.Item>

          {/* 确认支付密码字段 */}
          <Form.Item
            label={t("placeholder.confirmPaymentPassword")}
            name="confirmPaymentPassword"
            dependencies={["paymentPassword"]}
            rules={[
              {
                required: true,
                message: t("placeholder.reconfirmPaymentPassword"),
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("paymentPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(t("toast.paymentPasswordsDifferent")),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              allowClear
              placeholder={t("placeholder.reconfirmPaymentPassword")}
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
