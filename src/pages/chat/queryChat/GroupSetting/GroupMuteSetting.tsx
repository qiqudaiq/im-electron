import { LeftOutlined, CheckOutlined } from "@ant-design/icons";
import { Modal, InputNumber, message } from "antd";
import { FC, useState } from "react";
import { t } from "i18next";
import { IMSDK } from "@/layout/MainContentWrap";
import styles from "./group-setting.module.scss";
import clsx from "clsx";

export interface IMuteSettingModalProps {
  open: boolean;
  onClose: () => void;
  groupID: string;
  userID: string;
  isMuted?: boolean;
}

interface MuteOption {
  value: number;
  label: string;
  isCustom?: boolean;
}

const GroupMuteSetting: FC<IMuteSettingModalProps> = ({
  open,
  onClose,
  groupID,
  userID,
  isMuted,
}) => {
  const [selectedOption, setSelectedOption] = useState<MuteOption | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const muteOptions: MuteOption[] = [
    { value: 10 * 60, label: t('date.minute', { num: 10}) },
    { value: 60 * 60, label:  t('date.hour', { num: 1}) },
    { value: 12 * 60 * 60, label: t('date.hour', { num: 12}) },
    { value: 24 * 60 * 60, label: t('date.day', { num: 1}) },
    { value: 1, label: t('date.custom'), isCustom: true },
  ];

  if (isMuted) {
    muteOptions.push({ value: 0, label: t('placeholder.cancelMute') });
  }

  const handleOptionClick = (option: MuteOption) => {
    setSelectedOption(option);
    if (!option.isCustom) {
      setCustomMinutes(null);
    }
  };

  const handleSave = async () => {
    if (!selectedOption) {
      message.warning(t('placeholder.SelectMuteDuration'));
      return;
    }

    let mutedSeconds = selectedOption.value;

    // 处理自定义选项
    if (selectedOption.isCustom && customMinutes) {
      mutedSeconds = customMinutes * 60;
    } else if (selectedOption.isCustom && !customMinutes) {
      message.warning(t('placeholder.InputCustomMuteDuration'));
      return;
    }

    setIsLoading(true);
    try {
      await IMSDK.changeGroupMemberMute({
        groupID,
        userID,
        mutedSeconds,
      });
      message.success(t("toast.accessSuccess"));
      onClose();
    } catch (error) {
      message.error(t("toast.accessFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      title={null}
      footer={null}
      centered
      open={open}
      closable={false}
      onCancel={onClose}
      width={320}
      className="no-padding-modal"
    >
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center">
          <LeftOutlined
            className="mr-2 cursor-pointer"
            onClick={onClose}
            rev={undefined}
          />
          <span className="text-base font-medium">{t('placeholder.setMute')}</span>
        </div>
        <span className="cursor-pointer text-[#0289FA]" onClick={handleSave}>
          {t('placeholder.save')}
        </span>
      </div>
      <div className="py-2">
        {muteOptions.map((option) => (
          <div
            key={option.value}
            className={clsx(
              "flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-[#f5f5f5]",
              { "bg-[#f5f5f5]": selectedOption?.value === option.value },
            )}
            onClick={() => handleOptionClick(option)}
          >
            <div className="flex items-center">
              <span>{option.label}</span>
              {option.isCustom && selectedOption?.isCustom && (
                <InputNumber
                  className="ml-2"
                  placeholder={t('date.minuteText')}
                  min={1}
                  max={43200} // 30天上限
                  value={customMinutes}
                  onChange={(value) => setCustomMinutes(value)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
            {selectedOption?.value === option.value && (
              <CheckOutlined className="text-[#0289FA]" rev={undefined} />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default GroupMuteSetting;
