import { LeftOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Image, Space, Tabs } from "antd";
import clsx from "clsx";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { checkWalletExist, getAESkey, selectAllOrg, useRegister, getCaptcha, useSendSms, emailRegister } from "@/api/login";
import { setIMProfile } from "@/utils/storage";

import type { FormType } from "./index";
import { decryptAESKey, generateRSAKeyPair } from "@/utils/crypto";
import { IMSDK } from "@/layout/MainContentWrap";

type RegisterFormProps = {
  setFormType: (type: FormType) => void;
};

type FormFields = {
  email?: string;
  phoneNumber?: string;
  areaCode: string;
  verifyCode: string;
  account: string;
  password: string;
  password2: string;
  orgInvitationCode: string;
  nickname: string;
  captchaAnswer: string;
};

const platform = window.electronAPI?.getPlatform() ?? 5;

const RegisterForm = ({ setFormType }: RegisterFormProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormFields>();
  const navigate = useNavigate();

  const { mutate: register } = useRegister();
  const { mutate: semdSms } = useSendSms();
  const [loginMethod, setLoginMethod] = useState<"account" | "email">("account");
  const [captcha, setCaptcha] = useState({
    url: "",
    id: "",
  });


  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    loadCaptcha();
  }, []);


  /**
   *  VerificationCodeForRegister      = 1 // 注册
      VerificationCodeForResetPassword = 2 // 重置密码
      VerificationCodeForLogin         = 3 // 登录
      VerificationCodeForPaymentPwd    = 4 // 支付密码相关操作
      VerificationCodeForResetEmail    = 5 // 重置邮箱验证码
   */
  const sendSmsHandle = () => {
    const options = {
      email: form.getFieldValue("email"),
      usedFor: 1,
    };
    semdSms(options, {
      onSuccess() {
        setCountdown(60);
      },
    });
  };

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

  const loadCaptcha = async () => {
    const { data } = await getCaptcha();
    setCaptcha({
      url: data.captcha,
      id: data.id,
    });
  };
  const fingerprint = {
    userAgent: navigator.userAgent,
    screen: { width: screen.width, height: screen.height },
    timezone: new Date().getTimezoneOffset(),
    plugins: Array.from(navigator.plugins).map(p => p.name).join(',')
  };

  const onFinish = async (fields: FormFields) => {

    if (loginMethod === 'account') {
      register(
        {
          // verifyCode,
          orgInvitationCode: fields.orgInvitationCode,
          autoLogin: true,
          user: {
            nickname: fields.nickname,
            account: fields.account,
            faceURL: "",
            password: md5(fields.password),
          },
          captchaAnswer: fields.captchaAnswer,
          captchaId: captcha.id,
          // deviceCode: window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(fingerprint))),
          deviceCode: JSON.stringify(fingerprint),
        },
        {
          onSuccess(res) {
            init(res);
          },
        },
      );
    } else {
      try {
        const res = await emailRegister({
          verifyCode: fields.verifyCode,
          user: {
            nickname: fields.nickname,
            account: fields.account,
            password:  md5(fields.password),
            email: fields.email
          },
          platform: platform,
          orgInvitationCode: fields.orgInvitationCode,
        });
        init(res);
      } catch (error) {
        console.error('emailRegister error', error);
       
      }
    }
  };
  const init = async (res) => {

    message.success(t("toast.registerSuccess"));
    const { user_id, chat_token, im_token, organization_id, invite_user_id } = res.data;
    setIMProfile({ chatToken: chat_token, imToken: im_token, userID: user_id });

    const orgres = await selectAllOrg(chat_token);
    const currentOrg = orgres.data.data[0];
    localStorage.setItem("current_org_id", organization_id);
    localStorage.setItem("current_org_role", currentOrg.role);

    const { privateKey, publicKey } = generateRSAKeyPair();
    localStorage.setItem("rsaPrivateKey", privateKey);
    const {
      data: { encrypted_aes_key },
    } = await getAESkey(publicKey, chat_token);
    const aesKey = decryptAESKey(encrypted_aes_key, privateKey);
    localStorage.setItem("AES_KEY", aesKey);

    const { data: walletData } = await checkWalletExist(chat_token);
    localStorage.setItem("walletExist", walletData);

    // 如果有邀请人ID，则自动添加邀请人为好友
    if (invite_user_id) {
        // 如果失败了，先存储起来，等进入聊天页面IMSDK完全初始化后再尝试
        localStorage.setItem("pending_invite_user_id", invite_user_id);
    }

    navigate("/chat");
  };

  const back = () => {
    setFormType(0);
    form.resetFields();
  };

  const tabItems = [
    {
      key: 'account',
      label: t("placeholder.registerByAccount"),
    },
    {
      key: 'email',
      label: t("placeholder.registerByEmail"),
    },
  ];

  return (
    <div className="flex flex-col justify-between" >
      <div className="cursor-pointer text-sm text-gray-400" onClick={back}>
        <LeftOutlined rev={undefined} />
        <span className="ml-1">{t("placeholder.getBack")}</span>
      </div>
   
      
      <Tabs 
        activeKey={loginMethod}
        onChange={(key) => setLoginMethod(key as "account" | "email")}
        items={tabItems}
        className="mt-4"
      />
      
      <Form
        form={form}
        layout="vertical"
        labelCol={{ prefixCls: "custom-form-item" }}
        onFinish={onFinish}
        autoComplete="off"
        className="mt-4"
      >
          <>
            {
              loginMethod === 'email' && (
                <>
                  <Form.Item rules={[{ required: true }]} label={t("placeholder.email")} name="email">
                    <Input
                      allowClear
                      placeholder={t("toast.inputEmail")}
                    />
                  </Form.Item>
                  <Form.Item rules={[{ required: true }]} label={t("placeholder.verifyCode")} name="verifyCode">
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
                </>
              )
            }
            <Form.Item
              label={t("placeholder.nickName")}
              name="nickname"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input
                allowClear
                spellCheck={false}
                placeholder={t("toast.inputNickName")}
              />
            </Form.Item>
            <Form.Item
              label={t("placeholder.account")}
              name="account"
              rules={[
                {
                  required: true,
                  pattern: /^[a-zA-Z0-9\-_=+]{5,20}$/,
                  message: t("toast.accountRule"),
                },
              ]}
            >
              <Input
                allowClear
                spellCheck={false}
                placeholder={t("toast.inputAccount")}
              />
            </Form.Item>
            <Form.Item
              label={t("placeholder.invitationCode")}
              name="orgInvitationCode"
              rules={[{ required: true }]}
            >
              <Input allowClear placeholder={t("toast.inputOrgInvitationCode")} />
            </Form.Item>
            {
              loginMethod === 'account' && <Form.Item
                label={t("placeholder.verifyCode")}
                name="captchaAnswer"
                rules={[{ required: true }]}
              >
                <Input
                  allowClear
                  suffix={
                    <Image
                      src={captcha.url}
                      preview={false}
                      style={{ width: 75, cursor: 'pointer' }}
                      onClick={loadCaptcha}
                    />
                  }
                  placeholder={t("toast.inputVerifyCode")}
                />
              </Form.Item>
            }
            <Form.Item
              label={t("placeholder.password")}
              name="password"
              rules={[
                {
                  required: true,
                  pattern: /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,20}$/,
                  message: t("toast.passwordRules"),
                },
              ]}
            >
              <Input.Password allowClear placeholder={t("toast.inputPassword")} />
            </Form.Item>

            <Form.Item
              label={t("placeholder.confirmPassword")}
              name="password2"
              dependencies={["password"]}
              rules={[
                {
                  required: true,
                  message: t("toast.reconfirmPassword"),
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t("toast.passwordsDifferent")));
                  },
                }),
              ]}
              className="mb-8"
            >
              <Input.Password allowClear placeholder={t("toast.reconfirmPassword")} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                {t("confirm")}
              </Button>
            </Form.Item>
          </>

      </Form>
    </div>
  );
};

export default RegisterForm;
