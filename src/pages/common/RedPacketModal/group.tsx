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
import { emit } from "@/utils/events";
import { CreateTransfer, getTokenInfo } from "@/api/login";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import { IMSDK } from "@/layout/MainContentWrap";
import { useSendMessage } from "@/pages/chat/queryChat/ChatFooter/useSendMessage";
import { useUserStore } from "@/store";
import { useConversationStore } from "@/store/conversation";
import { aesEncrypt } from "@/utils/crypto";

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

export const Group = ({ closeOverlay = () => {}, formType }: WalletVerifyProps) => {
  const [form] = Form.useForm();
  const { sendMessage } = useSendMessage();
  const selfInfo = useUserStore((state) => state.selfInfo);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const isGroupSession = currentConversation?.conversationType === SessionType.Group;
  const groupId = currentConversation?.groupID;
  const [packetType, setPacketType] = useState<number>(0);
  const [redPacketNum, setRedPacketNum] = useState<number>(1);
  const [selectedCurrency, setSelectedCurrency] = useState();
  const [selectedMemberName, setSelectedMemberName] = useState();

  const [currencyList, setCurrencyList] = useState<any[]>([]);

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
    const { amount, mark, paymentPassword, type, count, currency, exclusive_receiver_id, password } = params;
    // mark === undefined ? mark = '' : mark
    const currencyName = selectedCurrency.label;

    const typeMap = {
      0: 2,
      1: 3,
      2: 5,
      3: 6,
    }
    const lucky_money_type_map = {
      0: 'NORMAL',
      1: 'RANDOM',
      2: 'SPECIAL',
      3: 'PASSWORD',
    }
    const transferData = {
      customType: 1001, // 设定转账消息类型
      data: {
        msg_id: `T${Date.now()}`, // 消息 ID
        create_time: Date.now(), // 创建时间
        creator: selfInfo.userID, // 发送者 ID
        room_id: `si_${selfInfo.userID}_${groupId}`, // 会话 ID
        total_amount: amount, // 转账金额
        code: "IM_CHART_REDPACKET", // 标识码
        currency: currencyName, // 货币类型（USD、CNY 等）
        sender: selfInfo.userID, // 发送者 ID
        belong_to: groupId, // 接收者 ID
        expire_time: Date.now() + 24 * 60 * 60 * 1000, // 24 小时后过期
        remark: mark, // 备注
        sender_nickname: selfInfo.nickname,
        extension: {
          lucky_money_type: lucky_money_type_map[type],
          special_receiver_id: exclusive_receiver_id,
          special_receiver_name: selectedMemberName,
        },
        status: "pending", // 转账状态（pending、accepted、expired）
      },
    };


    const transParams = {
      transaction_type: typeMap[type],
      total_amount: (type === 0 || type === 3) ? String(amount * count) : String(amount),
      total_count: count || 1,
      target_id: groupId,
      greeting: "11",
      currency_id: currency,
      pay_password: paymentPassword,
      exclusive_receiver_id,
      password,
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
      } else if (err.errCode === 10111) {
        message.error(t("toast.redCountOver"));
      }
    }
  };
  const getAmountMax = () => {
    if (packetType === 0) {
      return selectedCurrency?.max_red_packet_amount;
    }
    return selectedCurrency?.max_red_packet_amount * redPacketNum;
  };

  const getAmountLabel = () => {
    switch (packetType) {
      case 0:
        return t("redPacket.singleAmount");
      case 1:
        return t("redPacket.allAmount");
      case 2:
        return t("redPacket.redPacketAmount");
      case 3:
        return t("redPacket.singleAmount");
    }
  };
  const selectMember = () => {
      emit("OPEN_CHOOSE_MODAL", {
        type: "SELECT_RECEIVER",
        extraData: currentGroupInfo.groupID,
        onSelect: (item: any [])=>{
          if (item.length) {
            form.setFieldValue('exclusive_receiver_id', item[0].userID)
            setSelectedMemberName(item[0].nickname)
          }
        }
      });
  }

  return (
    <>
      <Form
        form={form}
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ span: 9 }}
        wrapperCol={{ span: 21 }}
        initialValues={{ type: 0, count: 1 }}
      >
        <Form.Item name="type" label={t("redPacket.redPacketType")}>
          <Select
            onChange={(value) => setPacketType(value)}
            options={[
              { value: 0, label: t("redPacket.normal") },
              { value: 1, label: t("redPacket.lucky") },
              { value: 2, label: t("redPacket.Exclusive") },
              { value: 3, label: t("redPacket.Command") },
            ]}
          />
        </Form.Item>
        {packetType === 2 && (
          <Form.Item
            label={t("redPacket.target")}
            name="exclusive_receiver_id"
          >
            <Button onClick={selectMember} type="link">{selectedMemberName || t("placeholder.selectMember")}</Button>
          </Form.Item>
        )}
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

        <Form.Item name="amount" label={getAmountLabel()} rules={[{ required: true }]}>
          <InputNumber
            style={{ width: "100%" }}
            placeholder={t("toast.amount")}
            min={0}
            max={getAmountMax()}
            precision={selectedCurrency?.decimals || 2}
          />
        </Form.Item>
        {packetType !== 2 && (
          <Form.Item
            name="count"
            label={t("redPacket.redPacketNumber")}
            rules={[{ required: true }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder={t("redPacket.inputCount")}
              min={1}
              max={currentGroupInfo.memberCount}
              onChange={setRedPacketNum}
            />
          </Form.Item>
        )}
        {packetType === 3 && (
          <Form.Item
            label={t("redPacket.password")}
            name="password"
            rules={[{ required: true }]}
          >
            <Input allowClear />
          </Form.Item>
        )}

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
