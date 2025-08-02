import { CloseOutlined, RightOutlined } from "@ant-design/icons";
import { CbEvents } from "@openim/wasm-client-sdk";
import { WSEvent } from "@openim/wasm-client-sdk/lib/types/entity";
import { useRequest } from "ahooks";
import { App, Button, Divider, Form, Input, Modal, Space, Spin } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";
import { useCopyToClipboard } from "react-use";

import logo from "../../../public/icons/mac_icon.png";
import { APP_NAME, APP_VERSION, SDK_VERSION } from "@/config";
import { feedbackToast } from "@/utils/common";

import { OverlayVisibleHandle, useOverlayVisible } from "../../hooks/useOverlayVisible";
import { IMSDK } from "../MainContentWrap";

const About: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (_, ref) => {
  const [form] = Form.useForm();

  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);

  return (
    <Modal
      title={null}
      footer={null}
      closable={false}
      open={isOverlayOpen}
      centered
      onCancel={closeOverlay}
      afterClose={() => form.resetFields()}
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      width={360}
      className="no-padding-modal"
      maskTransitionName=""
    >
      <AboutContent closeOverlay={closeOverlay} />
    </Modal>
  );
};

export default memo(forwardRef(About));

export const AboutContent = ({ closeOverlay }: { closeOverlay?: () => void }) => {
  const { modal } = App.useApp();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [_, copyToClipboard] = useCopyToClipboard();

  const { loading, runAsync } = useRequest(IMSDK.uploadLogs, {
    manual: true,
  });

  const tryLogReport = async (line: number) => {
    try {
      await runAsync({ line, ex: "" });
      feedbackToast({
        msg: t("placeholder.uploadSuccess"),
      });
    } catch (error) {
      // 错误已在 request.ts 中处理
    }
    setProgress(0);
  };

  useEffect(() => {
    const uploadHandler = ({
      data: { current, size },
    }: WSEvent<{ current: number; size: number }>) => {
      const progress = (current / size) * 100;
      setProgress(Number(progress.toFixed(0)));
    };
    IMSDK.on(CbEvents.OnUploadLogsProgress, uploadHandler);
    return () => {
      IMSDK.off(CbEvents.OnUploadLogsProgress, uploadHandler);
    };
  }, []);






  return (
    <Spin spinning={loading} tip={`${progress}%`}>
      <div className="bg-[var(--chat-bubble)]">
        <div className="app-drag flex items-center justify-between bg-[var(--gap-text)] p-5">
        <span className="text-base font-medium">{t("placeholder.about")}</span>
        <CloseOutlined
            className="app-no-drag cursor-pointer text-[#8e9aaf]"
            rev={undefined}
            onClick={closeOverlay}
          />
        </div>
        
        {/* 应用信息显示区域 */}
        <div className="flex flex-col items-center py-6">
          <img src={logo} alt="logo" className="mb-4 h-16 w-16" />
          <div className="text-center">
          <div>{`${APP_NAME} ${APP_VERSION}`}</div>

          </div>
       
        </div>

        <Divider className="border-1 m-0 border-[var(--gap-text)]" />

        {window.electronAPI && (
          <>
            <div
              className="flex cursor-pointer items-center justify-between border-b border-[var(--gap-text)] px-3 py-2"
              onClick={() => tryLogReport(10000)}
            >
              <div>{t("placeholder.reportLog")}</div>
              <RightOutlined rev={undefined} />
            </div>
          
            <div
              className="flex cursor-pointer items-center justify-between border-b border-[var(--gap-text)] px-3 py-2"
              onClick={async () => {
                if ((window as any).uploadSDKLogs) {
                  setUploading(true);
                  try {
                    await (window as any).uploadSDKLogs(1000);
                  } finally {
                    setUploading(false);
                    feedbackToast({
                      msg: t("placeholder.uploadSuccess"),
                    });
                  }
                }
              }}
            >
              <div>
                {uploading ? <Spin size="small" /> : "上传应用错误日志"}
              </div>
              <RightOutlined rev={undefined} />
            </div>
          </>
        )}
      </div>
    </Spin>
  );
};
