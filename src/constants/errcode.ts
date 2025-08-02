import { t } from "i18next";

export const ErrCodeMap: Record<number, string> = {
  // 系统错误 (10000-10099)
  10000: t('errCode.systemError'),
  10001: t('errCode.invalidParams'),
  10002: t('errCode.unauthorized'),
  10003: t('errCode.forbidden'),
  10004: t('errCode.tooFrequent'),
  10005: t('errCode.notFound'),
  10006: t('errCode.serverInternalError'),
  10007: t('errCode.invalidPageParams'),
  10010: t('errCode.liveKitUrlError'),
  10090: t('errCode.apiError'),
  10091: t('errCode.VerificationCodeError'),

  // 群组错误 (1200-1299)
  1207: t('errCode.GroupJoinDisabledError'),

  // 交易错误 (10100-10199)
  10100: t('errCode.insufficientBalance'),
  10101: t('errCode.transactionExpired'),
  10102: t('errCode.transactionNotFound'),
  10103: t('errCode.invalidAmount'),
  10104: t('errCode.alreadyReceived'),
  10105: t('errCode.notInGroup'),
  10106: t('errCode.notFriend'),
  10107: t('errCode.walletNotOpen'),
  10108: t('errCode.walletOpened'),
  10109: t('errCode.noRemaining'),
  10110: t('errCode.distributedLock'),
  10111: t('errCode.redPacketCountExceed'),
  10112: t('errCode.redPacketAmountNotDivisible'),
  10113: t('errCode.walletBalanceNotOpen'),

  // ValidateReceiverInfo 相关错误码: 10114-10130
  10114: t('errCode.receiverNotInOrganization'),
  10115: t('errCode.userNotInSameOrganization'),
  10116: t('errCode.cannotReceiveOwnTransfer'),
  10117: t('errCode.receiverNotTargetUser'),
  10118: t('errCode.orgTransferReceiverMustBeAdmin'),
  10119: t('errCode.receiverNotExclusiveReceiver'),
  10120: t('errCode.unknownTransactionType'),
  10121: t('errCode.incorrectPassword'),
  10122: t('errCode.passwordCannotBeEmpty'),

  // 余额错误 (10200-10299)
  10200: t('errCode.balanceNotFound'),
  10201: t('errCode.balanceUpdateFail'),

  // user errors: 10300-10399
  10300: t('errCode.DeviceLimitExceeded'),
  1306: t('errCode.FriendLimitReached'),
  10401: t('placeholder.AccountNoOrganization'),
  10400: t('errCode.OrganizationNotExists'),
  // 账户错误 (11000-11500)
  11002: t('errCode.userAccountError'),
  11003: t('errCode.userNotFound'),
  11004: t('errCode.userPwdError'),
  11006: t('errCode.accountExists'),

  // 直播错误 (11500-12000)
  11501: t('errCode.liveStreamRoomNotFound'),
  11510: t('errCode.liveStreamRoomExecutePermission'),
  11511: t('errCode.liveStreamRoomParticipantPermission'),
  11512: t('errCode.liveStreamParticipantBlocked'),
  11520: t('errCode.liveStreamSystemError'),

  // 原有错误码
  20001: t('errCode.passwordError'),
  20002: t('errCode.accountNotExist'),
  20003: t('errCode.phoneNumberRegistered'),
  20004: t('errCode.accountRegistered'),
  20005: t('errCode.operationTooFrequent'),
  20006: t('errCode.verificationCodeError'),
  20007: t('errCode.verificationCodeExpired'),
  20008: t('errCode.verificationCodeErrorLimitExceed'),
  20009: t('errCode.verificationCodeUsed'),
  20010: t('errCode.invitationCodeUsed'),
  20011: t('errCode.invitationCodeNotExist'),
  20012: t('errCode.operationRestriction'),
  20014: t('errCode.accountRegistered'),

  // 常见 HTTP 错误码
  400: t('errCode.badRequest'),           // 请求参数错误
  401: t('errCode.unauthorized'),         // 未授权
  403: t('errCode.forbidden'),            // 禁止访问
  404: t('errCode.notFound'),             // 资源未找到
  500: t('errCode.internalServerError'),  // 服务器内部错误
  502: t('errCode.badGateway'),           // 网关错误
  503: t('errCode.serviceUnavailable'),   // 服务不可用
  504: t('errCode.gatewayTimeout'),       // 网关超时
}

export const getErrCodeMessage = (code: number): string => {  
  return ErrCodeMap[code] || ''
}

export enum SendFailedErrCode {
  Blacked = 1302,
}
