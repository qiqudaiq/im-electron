import { message } from "@/AntdGlobalComp";
import { ErrCodeMap } from "@/constants";
import { t } from "i18next";
import { localErrorCapture } from "@/utils/errorCapture";

interface ErrorData {
  errCode: number;
  errMsg?: string;
}

export const errorHandle = (err: unknown) => {
  const errData = err as ErrorData;
  
  
  if (errData.errMsg) {
    // message.error(ErrCodeMap[errData.errCode] || t('errCode.systemError'));
  }
};
