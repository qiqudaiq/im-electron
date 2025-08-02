import { FormProps, Upload } from "antd";
import { Form, Input, message, Modal } from "antd";
import React, { useState } from "react";
import ImageResizer from "react-image-file-resizer";
import { t } from "i18next";
import { joinOrg, updateBusinessUserInfo } from "@/api/login";
import change_avatar from "@/assets/images/profile/change_avatar.png";
import OIMAvatar from "@/components/OIMAvatar";
import styles from "@/layout/LeftNavBar/left-nav-bar.module.scss";
import { useUserStore } from "@/store";
import { uploadFile } from "@/utils/imCommon";
import { getResourceUrl } from "@/utils/common";

type FieldType = {
  invitation_code: string;
  face_url: string;
  nickname: string;
};

interface IModalProps {
  joinOrgModalVisible: boolean;
  setJoinOrgModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess?: () => void;
}

const resizeFile = (file: File): Promise<File> =>
  new Promise((resolve) => {
    ImageResizer.imageFileResizer(
      file,
      400,
      400,
      "webp",
      90,
      0,
      (uri) => {
        resolve(uri as File);
      },
      "file",
    );
  });

const JoinOrgModal: React.FC<IModalProps> = (props) => {
  const { joinOrgModalVisible, setJoinOrgModalVisible, onSuccess } = props;
  const [form] = Form.useForm();
  const [faceUrl, setFaceUrl] = useState();
  const selfInfo = useUserStore((state) => state.selfInfo);
  const handleOk = () => {
    form.submit();
  };

  const onFinish: FormProps<FieldType>["onFinish"] = (values) => {
    joinOrg(values.invitation_code, values.nickname, values.face_url).then((res) => {
      setJoinOrgModalVisible(false);
      form.resetFields();
      message.success(t('toast.accessSuccess'));
      if (onSuccess) {
        onSuccess();
      }
    });
  };

  const handleCancel = () => {
    setJoinOrgModalVisible(false);
    form.resetFields();
    setFaceUrl(undefined);
  };

  const customUpload = async ({ file }: { file: File }) => {
    const resizedFile = await resizeFile(file);
    const filePath = await window.electronAPI?.saveFileToDisk({
      sync: true,
      file,
    });
    // console.log("test_file filePath: ", filePath);
    // const res = await encodeFile(resizedFile, filePath);
    // console.log("test_file res: ", res);
    // return;
    try {
      const {
        data: { url },
      } = await uploadFile(resizedFile, filePath);

      form.setFieldValue('face_url', url);
      setFaceUrl(url);
      // await updateBusinessUserInfo(newInfo);
      // updateSelfInfo(newInfo);
    } catch (error) {
      // feedbackToast({ error: t("toast.updateAvatarFailed") });
    }
  };

  return (
    <Modal
      title={t('placeholder.JoinOrganization')}
      open={joinOrgModalVisible}
      onOk={handleOk}
      onCancel={handleCancel}
    >
      <Form
        form={form}
        name="joinOrgModal"
        labelCol={{ span: 4 }}
        style={{ maxWidth: 600 }}
        onFinish={onFinish}
        autoComplete="off"
        initialValues={{
          face_url: selfInfo.faceURL,
          nickname: selfInfo.nickname
        }}
      >
        <Form.Item<FieldType> label={t('placeholder.Avatar')} name="face_url">
          <Upload
            accept=".jpeg,.png,.webp"
            showUploadList={false}
            customRequest={customUpload as any}
          >
            <div className={styles["avatar-wrapper"]}>
              <OIMAvatar src={ faceUrl || selfInfo.faceURL} text={selfInfo.nickname} />
              <div className={styles["mask"]}>
                <img src={getResourceUrl(change_avatar)} width={19} alt="" />
              </div>
            </div>
          </Upload>
        </Form.Item>
        <Form.Item<FieldType> rules={[{ required: true }]} label={t('placeholder.nickName')} name="nickname">
          <Input />
        </Form.Item>
        <Form.Item<FieldType>
          label={t('placeholder.invitationCode')}
          name="invitation_code"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default JoinOrgModal;
