import React, { useState, useEffect } from 'react';
import { Modal, Form } from 'antd';
import { t } from "i18next";
import { UNSAFE_NavigationContext } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import Tmp from './PreviewContent';
import { getChatToken } from "@/utils/storage";
import { useUserStore, useLiveStreamStore } from "@/store";

interface IProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type FieldType = {
  nickname: string;
  detail?: string;
  cover_obj?: string;
};

const CreateRoomModal: React.FC<IProps> = (props) => {
  const { open, setOpen } = props;
  const { navigator } = React.useContext(UNSAFE_NavigationContext);
  const [form] = Form.useForm<FieldType>();
  const [micEnabled, setMicEnabled] = useState(false);
  const [camEnabled, setCamEnabled] = useState(false);
  const { isLoading, createStream } = useLiveStreamStore();
  const selfInfo = useUserStore((state) => state.selfInfo);
  const uuid = uuidv4();


  const onCancel = () => {
      setOpen(false);
  };

  const onOK = async () => {
    try {
    const values = await form.validateFields();
      
      const tokens:any = await createStream({
        roomName: values.nickname,
        enableChat: true,
        allowParticipation: true,
        detail: values.detail,
        cover: values.cover_obj,
      });
    
    
      if (tokens) {
    const auth_token = (await getChatToken()) as string;
        navigator.push(`/live/host?at=${auth_token}&rt=${tokens.room_token}&ws=${encodeURIComponent(tokens?.ws_url)}`);
    onCancel();
      }
    } catch (error) {
      console.error('创建直播失败:', error);
      // 错误处理已在 Hook 中统一处理
    }
  };

  return (
    <Modal
      title={t('placeholder.CreateLiveStreaming')}
      open={open}
      onOk={onOK}
      onCancel={onCancel}
      width={1100}
      confirmLoading={isLoading}
      destroyOnHidden
      >
        <Tmp
          micEnabled={micEnabled}
          camEnabled={camEnabled}
          setMicEnabled={setMicEnabled}
          setCamEnabled={setCamEnabled}
          form={form}
        />
    </Modal>
  );
};

export default CreateRoomModal;
