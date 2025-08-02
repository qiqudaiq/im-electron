import { MessageType, SessionType } from "@openim/wasm-client-sdk";

export const GroupSessionTypes = [SessionType.Group, SessionType.WorkingGroup];

export const GroupSystemMessageTypes = [
  MessageType.GroupCreated,
  MessageType.GroupInfoUpdated,
  MessageType.MemberQuit,
  MessageType.GroupOwnerTransferred,
  MessageType.MemberKicked,
  MessageType.MemberInvited,
  MessageType.MemberEnter,
  MessageType.GroupDismissed,
  MessageType.GroupMemberMuted,
  MessageType.GroupMuted,
  MessageType.GroupCancelMuted,
  MessageType.GroupMemberCancelMuted,
  MessageType.GroupNameUpdated,
  // MessageType.GroupAnnouncementUpdated,
];

export const SystemMessageTypes = [
  MessageType.RevokeMessage,
  MessageType.FriendAdded,
  MessageType.BurnMessageChange,
  ...GroupSystemMessageTypes,
];

export enum CustomType {
  CallingInvite = 200,
  CallingAccept = 201,
  CallingReject = 202,
  CallingCancel = 203,
  CallingHungup = 204,
  CallRecord = 901,
  RedPacketClaim = 301,
  Transfer = 10086,
  RedPacket = 1001,
  claimNotice = 1002,
  GroupAnnouncement = 400,
  GroupCard = 401,
  Refund = 500,
}

// File upload size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,    // 5MB
  AUDIO: 10 * 1024 * 1024,   // 10MB
  VIDEO: 50 * 1024 * 1024,   // 50MB
  FILE: 20 * 1024 * 1024,    // 20MB
} as const;

export const FILE_SIZE_LIMITS_TEXT = {
  IMAGE: '5MB',
  AUDIO: '10MB',
  VIDEO: '50MB',
  FILE: '20MB',
} as const;
