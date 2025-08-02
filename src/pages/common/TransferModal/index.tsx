import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  QRCode,
  Select,
  Space,
  Tabs,
} from "antd";
import { t } from "i18next";
import md5 from "md5";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getTokenInfo, useLogin, useSendSms } from "@/api/login";
import { getBusinessUserInfo } from "@/api/login";
import { CreateTransfer } from "@/api/login";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import { areaCode } from "@/pages/login/areaCode";
import { SetPaymentPasswordForm } from "@/pages/walletForm/payment";
import { useUserStore } from "@/store";
import { useConversationStore } from "@/store/conversation";
import { aesEncrypt } from "@/utils/crypto";
import {
  getEmail,
  getIMUserID,
  getPhoneNumber,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
} from "@/utils/storage";

// 0转账 1输入支付密码
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

const TransferContent: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const [formType, setFormType] = useState<FormType>(0);

  return (
    <>
      <Modal
        title={t(`placeholder.transfer`)}
        footer={null}
        open={isOverlayOpen}
        onCancel={() => {
          closeOverlay();
          if (formType) {
            setFormType(0);
          }
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
        <TransferModal
          closeOverlay={closeOverlay}
          formType={formType}
          setFormType={setFormType}
        />
      </Modal>
    </>
  );
};

export default memo(forwardRef(TransferContent));

const TransferModal = ({
  closeOverlay = () => {},
  openWallet,
  formType,
}: WalletVerifyProps) => {
  const [form] = Form.useForm();
  const { sendMessage } = useSendMessage();
  const selfID = useUserStore((state) => state.selfInfo.userID);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const recvID = currentConversation?.userID;

  const [currencyList, setCurrencyList] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState();
  useEffect(() => {
    const fetchCurrencyInfo = async () => {
      const { data } = await getTokenInfo();
      const current_org_id = localStorage.getItem("current_org_id");
      const newList = data.data.map((item: any) => ({
        label: item.name,
        value: item.id,
        orgId: item.creator_id,
        decimals: item.decimals,
      }));
      setCurrencyList(newList.filter((item) => item.orgId === current_org_id));
    };
    fetchCurrencyInfo();
  }, []);

  const onFinish = async (params: any) => {
    const { amount, mark, paymentPassword, currency } = params;

    // 找到选择的货币名称
    const currencyName = selectedCurrency.label;
    // mark === undefined ? mark = '' : mark

    const transferData = {
      customType: 10086, // 设定转账消息类型
      data: {
        msg_id: `T${Date.now()}`, // 消息 ID
        create_time: Date.now(), // 创建时间
        creator: selfID, // 发送者 ID
        room_id: `si_${selfID}_${recvID}`, // 会话 ID
        total_amount: amount, // 转账金额
        code: "IM_CHART_TRANSFER", // 标识码
        currency: currencyName, // 货币类型（USD、CNY 等）
        sender: selfID, // 发送者 ID
        belong_to: recvID, // 接收者 ID
        expire_time: Date.now() + 24 * 60 * 60 * 1000, // 24 小时后过期
        remark: mark, // 备注
        currency_id: currency, // 货币 ID
        extension: {},
        status: "pending", // 转账状态（pending、completed、expired）
      },
    };

    const transParams = {
      type: 0,
      total_amount: String(amount),
      total_count: 1,
      target_id: recvID,
      greeting: "11",
      currency_id: currency,
      pay_password: paymentPassword,
    };


    const encryptodata = await aesEncrypt(JSON.stringify(transParams));
    const encryptoParams = {
      need_rsa_verify: false,
      encrypted_data: encryptodata,
    };
    try {
      const {
        errCode,
        data: { transaction_id },
      } = await CreateTransfer(encryptoParams);
      if (errCode === 0) {
        try {
          const { data: message } = await IMSDK.createCustomMessage({
            data: JSON.stringify({
              ...transferData,
              data: { ...transferData.data, msg_id: transaction_id },
            }),
            extension: "",
            description: "转账消息",
          });

          sendMessage({ message });
          const {
            customElem: { data },
          } = message;

          closeOverlay();
        } catch (error) {
          console.error({ msg: t("转账发送失败"), error });
        }
      }
    } catch (err: any) {
      console.error(err, "err");
      // 不需要显示错误提示，因为 request.ts 的拦截器已经处理了
    }
  };

  return (
    <>
      <Form
        form={form}
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Form.Item
          name="currency"
          label={t("placeholder.currency")}
          rules={[{ required: true }]}
        >
          <Select
            style={{ width: "100%" }}
            placeholder={t("toast.selectCurrency")}
            options={currencyList}
            onChange={(value, option) => {
              setSelectedCurrency(option);
            }}
          />
        </Form.Item>
        <Form.Item
          name="amount"
          label={t("placeholder.amount")}
          rules={[{ required: true }]}
        >
          <InputNumber
            style={{ width: "100%" }}
            placeholder={t("toast.amount")}
            min={0}
            precision={selectedCurrency?.decimals || 2}
          />
        </Form.Item>
        <Form.Item label={t("placeholder.mark")} name="mark">
          <Input allowClear />
        </Form.Item>

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
          <Input.OTP mask="🔒" />
        </Form.Item>

        <Form.Item wrapperCol={{ span: 18, offset: 6 }}>
          <Button type="primary" htmlType="submit" block>
            {t("placeholder.pay")}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
