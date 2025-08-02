import {
  Button,
  Checkbox,
  Form,
  Input,
  message,
  Modal,
  Space,
  Tabs,
} from "antd";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeOrg,
  checkWalletExist,
  getAESkey,
  selectAllOrg,
  useLogin,
  useSendSms,
} from "@/api/login";
import { decryptAESKey, generateRSAKeyPair } from "@/utils/crypto";
import {
  getEmail,
  getPhoneNumber,
  getRememberAccountCredentials,
  getRememberEmailCredentials,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
  setRememberAccountCredentials,
  setRememberEmailCredentials,
} from "@/utils/storage";
import type { FormType } from "./index";
import styles from "./index.module.scss";
import JoinOrgModal from "@/layout/LeftNavBar/JoinOrgModal";

// 0login 1resetPassword 2register
enum LoginType {
  Password,
  VerifyCode,
}

type LoginFormProps = {
  setFormType: (type: FormType) => void;
  loginMethod: "account" | "email" | "verifyCode";
  updateLoginMethod: (method: "account" | "email" | "verifyCode") => void;
};

const LoginForm = ({ loginMethod, setFormType, updateLoginMethod }: LoginFormProps) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);
  const { mutate: login, isLoading: loginLoading } = useLogin();
  const { mutate: semdSms } = useSendSms();
  const [QRCodeStatus, setQRCodeStatus] = useState("loading");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [joinOrgModalVisible, setJoinOrgModalVisible] = useState(false);

  const [countdown, setCountdown] = useState(0);

  // 加载已保存的凭据
  useEffect(() => {
    if (loginMethod === "account") {
      const { account, password } = getRememberAccountCredentials();
      if (account && password) {
        form.setFieldsValue({ account, password });
        setRememberPassword(true);
      } else {
        // 没有存储的账号密码，取消勾选状态
        setRememberPassword(false);
        // 只保留账号，清除密码
        form.setFieldsValue({ account: account || "", password: "" });
      }
    } else if (loginMethod === "email") {
      const { email, password } = getRememberEmailCredentials();
      if (email && password) {
        form.setFieldsValue({ email, password });
        setRememberPassword(true);
      } else {
        // 没有存储的邮箱密码，取消勾选状态
        setRememberPassword(false);
        // 只保留邮箱，清除密码
        form.setFieldsValue({ email: email || "", password: "" });
      }
    }
  }, [loginMethod, form]);

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

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (QRCodeStatus === "active") {
      // @ts-ignore
      timer = setTimeout(() => {
        setQRCodeStatus("expired");
      }, 1000 * 60 * 5);
    }

    return () => {
      if (QRCodeStatus !== "active") {
        clearTimeout(timer);
      }
    };
  }, [QRCodeStatus]);

  const doLogin = async (data) =>{
        // 保存记住的凭据
        if (rememberPassword && originalPassword) {
          if (loginMethod === "account" && params.account) {
            setRememberAccountCredentials(params.account, originalPassword);
          } else if (loginMethod === "email" && params.email) {
            setRememberEmailCredentials(params.email, originalPassword);
          }
        }
        const { chatToken, imToken, userID } = data.data;

        setIMProfile({ chatToken, imToken, userID });
        const orgres = await selectAllOrg(chatToken);
        const allOrgs = orgres.data.data;
        // if (allOrgs.length) {
        //   message.error(t("placeholder.AccountNoOrganization"));
        //   setJoinOrgModalVisible(true);
        //   return;
        // }
        const orgids = allOrgs.map((org) => org.organization_id);
        let current_org_id = localStorage.getItem("current_org_id");
        if (!current_org_id || !orgids.includes(current_org_id)) {
          if (!orgids.length) {
            message.error(t("placeholder.AccountNoOrganization"));
            setJoinOrgModalVisible(true);
            return;
          }
          const currentOrg = allOrgs[0];
          localStorage.setItem("current_org_id", currentOrg.organization_id);
          localStorage.setItem("current_org_role", currentOrg.role);
          current_org_id = currentOrg.organization_id;
        }

        const imres = await changeOrg(chatToken, current_org_id);
        const { im_token, im_server_user_id } = imres.data;
        setIMProfile({ chatToken, imToken: im_token, userID: im_server_user_id });
        const { privateKey, publicKey } = generateRSAKeyPair();
        localStorage.setItem("rsaPrivateKey", privateKey);
        const {
          data: { encrypted_aes_key },
        } = await getAESkey(publicKey, chatToken);
        const aesKey = decryptAESKey(encrypted_aes_key, privateKey);
        localStorage.setItem("AES_KEY", aesKey);

        const { data: walletData } = await checkWalletExist(chatToken);
        localStorage.setItem("walletExist", walletData);
        navigate("/chat", {
          flushSync: true,
        });
  }

  const onFinish = async () => {
    const params = form.getFieldsValue();
    const originalPassword = params.password ?? "";
    if (loginType === 0) {
      params.password = md5(params.password ?? "");
    }
    if (params.phoneNumber) {
      setAreaCode(params.areaCode);
      setPhoneNumber(params.phoneNumber);
    }
    if (params.email) {
      setEmail(params.email);
    }
    login(params, {
      onSuccess: async (data) => {
        // 保存记住的凭据
        if (rememberPassword && originalPassword) {
          if (loginMethod === "account" && params.account) {
            setRememberAccountCredentials(params.account, originalPassword);
          } else if (loginMethod === "email" && params.email) {
            setRememberEmailCredentials(params.email, originalPassword);
          }
        }
        const { chatToken, imToken, userID } = data.data;

        setIMProfile({ chatToken, imToken, userID });
        const orgres = await selectAllOrg(chatToken);
        const allOrgs = orgres.data.data;

        const orgids = allOrgs.map((org) => org.organization_id);
        let current_org_id = localStorage.getItem("current_org_id");
        if (!current_org_id || !orgids.includes(current_org_id)) {
          if (!orgids.length) {
            message.error(t("placeholder.AccountNoOrganization"));
            setJoinOrgModalVisible(true);
            return;
          }
          const currentOrg = allOrgs[0];
          localStorage.setItem("current_org_id", currentOrg.organization_id);
          localStorage.setItem("current_org_role", currentOrg.role);
          current_org_id = currentOrg.organization_id;
        }

        const imres = await changeOrg(chatToken, current_org_id);
        const { im_token, im_server_user_id } = imres.data;
        setIMProfile({ chatToken, imToken: im_token, userID: im_server_user_id });
        const { privateKey, publicKey } = generateRSAKeyPair();
        localStorage.setItem("rsaPrivateKey", privateKey);
        const {
          data: { encrypted_aes_key },
        } = await getAESkey(publicKey, chatToken);
        const aesKey = decryptAESKey(encrypted_aes_key, privateKey);
        localStorage.setItem("AES_KEY", aesKey);

        const { data: walletData } = await checkWalletExist(chatToken);
        localStorage.setItem("walletExist", walletData);
        navigate("/chat", {
          flushSync: true,
        });
      },
    });
  };

  const sendSmsHandle = () => {
    const options = {
      account: form.getFieldValue("account"),
      email: form.getFieldValue("email"),
      areaCode: form.getFieldValue("areaCode"),
      usedFor: 3,
    };
    if (loginMethod === "account") {
      delete options.email;
    }
    if (loginMethod === "email") {
      delete options.account;
      delete options.areaCode;
    }

    semdSms(options, {
      onSuccess() {
        setCountdown(60);
      },
    });
  };

  const onLoginMethodChange = (key: string) => {
    updateLoginMethod(key as "account" | "email");
  };

  // @ts-ignore
  return (
    <>
      <JoinOrgModal
        joinOrgModalVisible={joinOrgModalVisible}
        setJoinOrgModalVisible={setJoinOrgModalVisible}
        onSuccess={onFinish}
      />
      <div className="flex flex-row items-center justify-between">
        <div className="text-xl font-medium">{t("placeholder.welcome")}</div>
      </div>
      <Tabs
        className={styles["login-method-tab"]}
        activeKey={loginMethod}
        items={[
          { key: "account", label: t("placeholder.account") },
          { key: "email", label: t("placeholder.email") },
        ]}
        onChange={onLoginMethodChange}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ prefixCls: "custom-form-item" }}
        initialValues={{
          areaCode: "+86",
          phoneNumber: getPhoneNumber() ?? "",
          email: getEmail() ?? "",
          account:
            loginMethod === "account" ? getRememberAccountCredentials().account : "",
        }}
      >
        {loginMethod === "account" ? (
          <Form.Item label={t("placeholder.account")}>
            <Space.Compact className="w-full">
              <Form.Item name="account" noStyle>
                <Input allowClear placeholder={t("toast.inputAccount")} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
        ) : (
          <Form.Item
            label={t("placeholder.email")}
            name="email"
            rules={[{ type: "email", message: t("toast.inputCorrectEmail") }]}
          >
            <Input allowClear placeholder={t("toast.inputEmail")} />
          </Form.Item>
        )}

        {loginType === LoginType.VerifyCode && loginMethod === "email" ? (
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
          <Form.Item label={t("placeholder.password")} name="password">
            <Input.Password allowClear placeholder={t("toast.inputPassword")} />
          </Form.Item>
        )}

        <div className="mb-2">
          <Checkbox
            checked={rememberPassword}
            onChange={(e) => setRememberPassword(e.target.checked)}
          >
            {t("placeholder.rememberPassword")}
          </Checkbox>
        </div>

        <div className="mb-4 flex flex-row justify-between">
          <span
            className="cursor-pointer text-sm text-gray-400"
            onClick={() => {
              if (loginMethod === "email") {
                setFormType(1);
              } else {
                // 账户登录忘记密码，提示联系管理员
                Modal.info({
                  title: t("placeholder.forgetPassword"),
                  content: t("placeholder.contactAdminForPassword"),
                  okText: t("confirm"),
                });
              }
            }}
          >
            {t("placeholder.forgetPassword")}
          </span>
          {loginMethod === "email" && (
            <>
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
                }${t("placeholder.login")}`}
              </span>
            </>
          )}
        </div>

        <Form.Item className="mb-4">
          <Button type="primary" htmlType="submit" block loading={loginLoading}>
            {t("placeholder.login")}
          </Button>
        </Form.Item>

        <div className="flex flex-row items-center justify-center">
          <span className="text-sm text-gray-400">
            {t("placeholder.registerToast")}
          </span>
          <span
            className="cursor-pointer text-sm text-blue-500"
            onClick={() => setFormType(2)}
          >
            {t("placeholder.toRegister")}
          </span>
        </div>
      </Form>
    </>
  );
};

export default LoginForm;
