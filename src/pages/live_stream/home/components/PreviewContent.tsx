import React, { useState, useEffect, useRef } from 'react';
import cam_icon from '@/assets/images/live/cam_icon.png';
import cam_disabled_icon from '@/assets/images/live/cam_disabled_icon.png';
import mic_icon from '@/assets/images/live/mic_icon.png';
import mic_disabled_icon from '@/assets/images/live/mic_disabled_icon.png';
import upload_image_icon from '@/assets/images/live/upload_image_icon.png';
import { Col, Row, Space, Dropdown, Form, Input, Upload } from 'antd';
import type { FormInstance, UploadProps } from 'antd';
import { UploadRequestOption } from "rc-upload/lib/interface";

import { DownOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { t } from "i18next";
import { splitUpload } from "@/utils/splitUpload";
import { message } from 'antd';

const { Dragger } = Upload;

const iconStyle = {
  width: 18,
  height: 18,
}

type FieldType = {
  nickname: string;
  detail?: string;
  cover_obj?: string;
};

interface IProps {
  micEnabled: boolean;
  setMicEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  camEnabled: boolean;
  setCamEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  form: FormInstance<FieldType>;
}

const PreviewContent: React.FC<IProps> = (props) => {
  const { micEnabled, setMicEnabled, camEnabled, setCamEnabled, form } = props;
  const [loading, setLoading] = useState(false);
  const [imgUrl, setImgUrl] = useState();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({
    cameras: [],
    microphones: []
  });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // 获取可用设备
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device: MediaDeviceInfo) => device.kind === 'videoinput');
      const microphones = devices.filter((device: MediaDeviceInfo) => device.kind === 'audioinput');
      
      setAvailableDevices({ cameras, microphones });
      
      // 设置默认设备
      if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (microphones.length > 0) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
    } catch (error) {
      console.error(t('livestream.deviceListError') + ':', error);
    }
  };

  // 获取媒体流
  const getMediaStream = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: camEnabled ? { 
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false,
        audio: micEnabled ? { 
          deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined 
        } : false
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current && camEnabled) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error(t('livestream.mediaStreamError') + ':', error);
    }
  };

  // 停止媒体流
  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 初始化设备
  useEffect(() => {
    getAvailableDevices();
    return () => {
      stopMediaStream();
    };
  }, []);

  // 监听设备变化
  useEffect(() => {
    if (camEnabled || micEnabled) {
      getMediaStream();
    } else {
      stopMediaStream();
    }
  }, [camEnabled, micEnabled, selectedCamera, selectedMicrophone]);

  const handleMicMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedMicrophone(e.key);
  };

  const handleCamMenuClick: MenuProps['onClick'] = (e) => {
    setSelectedCamera(e.key);
  };

  const micMenuProps = {
    items: availableDevices.microphones.map((d) => ({ label: d.label || t('livestream.microphoneDevice', { deviceId: d.deviceId.slice(0, 8) }), key: d.deviceId })),
    selectedKeys: [selectedMicrophone],
    onClick: handleMicMenuClick,
  };

  const camMenuProps = {
    items: availableDevices.cameras.map((d) => ({ label: d.label || t('livestream.cameraDevice', { deviceId: d.deviceId.slice(0, 8) }), key: d.deviceId })),
    selectedKeys: [selectedCamera],
    onClick: handleCamMenuClick,
  };

  const toggleMicrophone = () => {
    setMicEnabled(!micEnabled);
  };

  const toggleCamera = () => {
    setCamEnabled(!camEnabled);
  };

  const fileHandle = async (options: UploadRequestOption) => {
    const file = options.file as File;
    setLoading(true);
    
    try {
      const result = await splitUpload(file, (progress) => {
      });
      
      if (result.error) {
        message.error(t('livestream.uploadFailed') + ': ' + result.error.message);
        options.onError?.(result.error);
      } else if (result.url) {
        // 设置表单字段值
        form.setFieldValue('cover_obj', result.url);
        message.success(t('livestream.uploadSuccess'));
        options.onSuccess?.(result.url);
        // 设置预览图片
        setImgUrl({
          uid: file.name,
          name: file.name,
          status: 'done',
          url: result.url,
        } as any);
      }
    } catch (error) {
      console.error(t('livestream.uploadError') + ':', error);
      message.error(t('livestream.uploadFailed'));
      options.onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    accept: 'image/*',
    fileList: imgUrl ? [imgUrl] : [],
    customRequest: fileHandle,
    disabled: loading,
    onChange(info) {
      const { status } = info.file;
      if (status !== 'uploading') {
      }
      if (status === 'done') {
      } else if (status === 'error') {
      }
    },
    onDrop(e) {
    },
  };

  return (
    <Row>
      <Col span={16}>
        <div style={{ height: 395, borderRadius: 8, backgroundColor: '#131826', position: 'relative' }}>
          {camEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
                style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                  borderRadius: 8,
                transform: 'scaleX(-1)', // 镜像翻转
                }}
            />
          ) : (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              color: '#fff',
              fontSize: 16
            }}>
                {t('livestream.videoNotAvailable')}
              </div>
          )}
          <div style={{ 
            position: 'absolute', 
            borderRadius: 20, 
            color: '#fff', 
            bottom: 20, 
            left: 20, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            padding: '5px 16px', 
            fontSize: 14 
          }}>
            {t('livestream.previewScreen')}
          </div>
        </div>
        <Space style={{ marginTop: 20 }}>
          <Dropdown.Button 
            disabled={!availableDevices.microphones || availableDevices.microphones.length === 0} 
            menu={micMenuProps} 
            onClick={toggleMicrophone} 
            icon={<DownOutlined />}
          >
            {micEnabled ? (
              <img src={mic_icon} style={iconStyle} />
            ) : (
              <img src={mic_disabled_icon} style={iconStyle} />
            )}
            {t('livestream.microphone')}
          </Dropdown.Button>
          <Dropdown.Button 
            disabled={!availableDevices.cameras || availableDevices.cameras.length === 0} 
            menu={camMenuProps} 
            onClick={toggleCamera} 
            icon={<DownOutlined />}
          >
            {camEnabled ? (
              <img src={cam_icon} style={iconStyle} />
            ) : (
              <img src={cam_disabled_icon} style={iconStyle} />
            )}
            {t('livestream.camera')}
          </Dropdown.Button>
        </Space>
      </Col>
      <Col span={8} style={{ paddingLeft: 20 }}>
        <Form
          name="basic"
          layout='vertical'
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 600 }}
          initialValues={{ remember: true }}
          autoComplete="off"
        >
          <Form.Item<FieldType>
            label={<div style={{ fontWeight: 'bold' }}>{t('livestream.liveTitle')}</div>}
            name="nickname"
            rules={[{ required: true, message: 'Please input your username!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item<FieldType>
            label={<div style={{ fontWeight: 'bold' }}>{t('livestream.liveDescription')}</div>}
            name="detail"
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item<FieldType>
            label={<div style={{ fontWeight: 'bold' }}>{t('livestream.liveCover')}</div>}
            name="cover_obj"
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={upload_image_icon} style={{ width: 30, height: 30 }} />
              </p>
              <p className="ant-upload-text">{t('livestream.uploadCoverImage')}</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Col>
    </Row>
  );
}

export default PreviewContent;
