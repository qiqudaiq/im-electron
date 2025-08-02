export enum TicketStatus {
  UNUSED = 0,  // 未使用
  USED = 1,    // 已使用
  EXPIRED = 2  // 已过期
}

export interface Ticket {
  id: string;
  name: string;
  description: string;
  createTime: number;
  expireTime: number;
  status: TicketStatus;
  type: string;
}

export type TicketFilterType = 'unused' | 'used' | 'expired'; 