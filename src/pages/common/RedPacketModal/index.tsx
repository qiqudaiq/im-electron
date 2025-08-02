import { SessionType } from "@openim/wasm-client-sdk";
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

import { CreateTransfer, getTokenInfo } from "@/api/login";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import { useUserStore } from "@/store";
import { useConversationStore } from "@/store/conversation";
import { aesEncrypt } from "@/utils/crypto";

import { Group } from "./group";

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

const RedPacketContent: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const [formType, setFormType] = useState<FormType>(0);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const isGroupSession = currentConversation?.conversationType === SessionType.Group;

  return (
    <>
      <Modal
        title={t(`redPacket.redPacket`)}
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
        {isGroupSession ? (
          <Group
            closeOverlay={closeOverlay}
            formType={formType}
            setFormType={setFormType}
          />
        ) : (
          <RedPacketModal
            closeOverlay={closeOverlay}
            formType={formType}
            setFormType={setFormType}
          />
        )}
      </Modal>
    </>
  );
};

export default memo(forwardRef(RedPacketContent));

const RedPacketModal = ({
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
        max_red_packet_amount: item.max_red_packet_amount,
        decimals: item.decimals,
      }));
      setCurrencyList(newList.filter((item) => item.orgId === current_org_id));
    };
    fetchCurrencyInfo();
  }, []);
  const onFinish = async (params: any) => {
    const { amount, mark, paymentPassword, currency } = params;
    // mark === undefined ? mark = '' : mark
    const currencyName = selectedCurrency.label;

    const transferData = {
      customType: 1001, // 设定转账消息类型
      data: {
        msg_id: `T${Date.now()}`, // 消息 ID
        create_time: Date.now(), // 创建时间
        creator: selfID, // 发送者 ID
        room_id: `si_${selfID}_${recvID}`, // 会话 ID
        total_amount: amount, // 转账金额
        code: "IM_CHART_REDPACKET", // 标识码
        currency: currencyName, // 货币类型（USD、CNY 等）
        sender: selfID, // 发送者 ID
        belong_to: recvID, // 接收者 ID
        expire_time: Date.now() + 24 * 60 * 60 * 1000, // 24 小时后过期
        remark: mark, // 备注
        extension: {},
        status: "pending", // 转账状态（pending、accepted、expired）
      },
    };

    const transParams = {
      transaction_type: 1,
      total_amount: String(amount),
      total_count: 1,
      target_id: recvID,
      currency_id: currency,
      greeting: "11",
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
            description: "红包消息",
          });

          sendMessage({ message });
          const {
            customElem: { data },
          } = message;

          closeOverlay();
        } catch (error) {
          console.error({ msg: t("红包发送失败"), error });
        }
      }
    } catch (err: any) {
      if (err.errCode === 11004) {
        message.error(t("toast.PayPasswordError"));
      } else if (err.errCode === 10100) {
        message.error(t("toast.insufficientBalance"));
      } else if (err.errCode === 10103) {
        message.error(
          `${t("toast.SingleRedPacketLimit")} ${
            selectedCurrency.max_red_packet_amount
          } ${selectedCurrency.label}`,
        );
      }
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
            max={selectedCurrency?.max_red_packet_amount}
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
