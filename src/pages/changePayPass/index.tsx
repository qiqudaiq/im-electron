import { Button, Form, Input, message, Modal, QRCode, Select, Space, Tabs } from "antd";
import { t } from "i18next";
import md5 from "md5";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  checkPassWord,
  getPublicKey,
  useLogin,
  useSendSms,
  changePaymentPassword,
} from "@/api/login";
import { getBusinessUserInfo } from "@/api/login";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { areaCode } from "@/pages/login/areaCode";
import { SetNewPaymentPasswordForm } from "./setNewPayment";
import {
  getEmail,
  getIMUserID,
  getPhoneNumber,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
} from "@/utils/storage";
import { handleEncryption, updatePublickey } from "@/utils/jsencrypt";
import { aesEncrypt } from "@/utils/crypto";

// 0login 1resetPassword 2register
enum LoginType {
  Password,
  VerifyCode,
}

// 0验证 1支付密码
type FormType = 0 | 1;

type WalletVerifyProps = {
  setFormType?: (type: FormType) => void;
  loginMethod?: "phone" | "email";
  updateLoginMethod?: (method: "phone" | "email") => void;
  open?: boolean;
  close?: () => void;
  openWallet?: () => void;
  closeOverlay?: () => void;
  formType?: number;
};

const userId = await getIMUserID();

const ChangePayPwd: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { openWallet } = _;
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <>
      <Modal
        title={t(`placeholder.${"setPaymentPassword"}`)}
        footer={null}
        open={isOverlayOpen}
        onCancel={() => {
          closeOverlay();
        }}
        centered
        destroyOnHidden
        styles={{
          mask: {
            opacity: 0,
            transition: "none",
          },
        }}
        maskTransitionName=""
      >
        <ChangePayPwdForm closeOverlay={closeOverlay} openWallet={openWallet} />
      </Modal>
    </>
  );
};

export default memo(forwardRef(ChangePayPwd));

const ChangePayPwdForm = ({
  loginMethod,
  closeOverlay = () => {},
}: WalletVerifyProps) => {
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);
  const { mutate: login, isLoading: loginLoading } = useLogin();
  const { mutate: semdSms } = useSendSms();

  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
        if (countdown === 1) {
          clearTimeout(timer);
          setCountdown(0);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onFinish = async (params: API.Login.LoginParams) => {
    if (loginType === 0) {
      const baseParams = {
        login_pwd: md5(params.password),
        new_pay_pwd: params.newPaymentPassword,
      };
      const encryptParams = await aesEncrypt(JSON.stringify(baseParams));
      const finalParams = {
        need_rsa_verify: false,
        encrypted_data: encryptParams,
      };

      try {
        const { data } = await checkPassWord(md5(params.password));
        if (data) {
          const { data: result } = await changePaymentPassword(finalParams);
          if (result) {
            message.success(t("toast.changePasswordSuccess"));
            closeOverlay();
          }
        }
      } catch (error) {
        message.error(t("toast.wrongPassword"));
      }
    }
  };

  const sendSmsHandle = () => {
    const options = {
      phoneNumber: form.getFieldValue("phoneNumber"),
      email: form.getFieldValue("email"),
      areaCode: form.getFieldValue("areaCode"),
      usedFor: 3,
    };
    if (loginMethod === "phone") {
      delete options.email;
    }
    if (loginMethod === "email") {
      delete options.phoneNumber;
      delete options.areaCode;
    }

    semdSms(options, {
      onSuccess() {
        setCountdown(60);
      },
    });
  };

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ prefixCls: "custom-form-item" }}
        initialValues={{
          areaCode: "+86",
          phoneNumber: getPhoneNumber() ?? "",
        }}
      >
        {/* <Form.Item label={t("placeholder.phoneNumber")}>
          <Space.Compact className="w-full">
            <Form.Item name="areaCode" noStyle>
              <Select options={areaCode} className="!w-28" disabled />
            </Form.Item>
            <Form.Item name="phoneNumber" noStyle>
              <Input readOnly disabled placeholder={t("toast.inputPhoneNumber")} />
            </Form.Item>
          </Space.Compact>
        </Form.Item> */}

        {loginType === LoginType.VerifyCode ? (
          <Form.Item label={t("placeholder.verifyCode")} name="verifyCode">
            <Space.Compact className="w-full">
              <Input
                allowClear
                placeholder={t("toast.inputVerifyCode")}
                className="w-full"
              />
              <Button type="primary" onClick={sendSmsHandle} loading={countdown > 0}>
                {countdown > 0
                  ? t("date.second", { num: countdown })
                  : t("placeholder.sendVerifyCode")}
              </Button>
            </Space.Compact>
          </Form.Item>
        ) : (
          <Form.Item
            label={t("placeholder.verifyPassword")}
            name="password"
            rules={[
              {
                required: true,
                message: t("toast.inputPassword"),
              },
            ]}
          >
            <Input.Password allowClear placeholder={t("toast.inputPassword")} />
          </Form.Item>
        )}

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

        {/* <div className="mb-10 flex flex-row justify-between">
          <span className="cursor-pointer text-sm text-gray-400"></span>
          <span
            className="cursor-pointer text-sm text-[var(--primary)]"
            onClick={() =>
              setLoginType(
                loginType === LoginType.Password
                  ? LoginType.VerifyCode
                  : LoginType.Password,
              )
            }
          >
            {`${
              loginType === LoginType.Password
                ? t("placeholder.verifyCode")
                : t("placeholder.password")
            }${t("placeholder.verify")}`}
          </span>
        </div> */}

        <Form.Item className="mb-4">
          <Button type="primary" htmlType="submit" block loading={loginLoading}>
            {t("placeholder.verify")}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
