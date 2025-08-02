import { Button, Form, Input, message, Modal, Space } from "antd";
import { t } from "i18next";
import { useEffect, useState } from "react";
import { modifyEmail, useSendSms } from "@/api/login";
import { useUserStore } from "@/store";

interface IProps {
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ModifyEmail: React.FC<IProps> = (props) => {

    const { open, setOpen } = props
    const { mutate: semdSms } = useSendSms();
    const [form] = Form.useForm();
    const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);

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

    const sendSmsHandle = () => {
        const options = {
            email: form.getFieldValue("new_email"),
            usedFor: 5,
        };

        semdSms(options, {
            onSuccess() {
                setCountdown(60);
            },
        });
    };
    const onFinish =  (values: any) => {
     modifyEmail(values).then((res) => { 
        message.success(t("toast.accessSuccess"));
        updateSelfInfo({
            email: values.new_email,
        });

    }).catch(e=>{
        console.error(e);
    })
    };

    const closeDialog = () => {
        setOpen(false);
        form.resetFields();
    };
    return (
        <Modal
            title={null}
            footer={null}
            closable={false}
            open={open}
            centered
            onCancel={closeDialog}
            destroyOnHidden
            styles={{
                mask: {
                    opacity: 0,
                    transition: "none",
                },
            }}
            width={484}
            className="no-padding-modal"
            maskTransitionName=""
        >
            <div>
                <div className="flex bg-[var(--chat-bubble)] p-5">
                    <span className="text-base font-medium">修改邮箱</span>
                </div>
                <Form
                    form={form}
                    colon={false}
                    requiredMark={false}
                    labelCol={{ span: 3 }}
                    onFinish={onFinish}
                    className="sub-label-form p-6.5"
                    autoComplete="off"
                >
                    <Form.Item
                        label={t("placeholder.email")}
                        name="new_email"
                        rules={[{ type: "email", message: t("toast.inputCorrectEmail"), required: true }]}
                    >
                        <Space>
                            <Input spellCheck={false} />
                        </Space>
                    </Form.Item>
                    <Form.Item label={t("placeholder.verifyCode")} name="verify_code" rules={[{ required: true }]}>
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

                    <Form.Item className="mb-0">
                        <div className="flex justify-end">
                            <Button
                                className="mr-3.5 border-0 bg-[var(--chat-bubble)] px-6"
                                onClick={closeDialog}
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                className="px-6"
                                type="primary"
                                htmlType="submit"
                            >
                                {t("confirm")}
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
};

export default ModifyEmail;
