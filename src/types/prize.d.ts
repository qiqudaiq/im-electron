export enum PrizeType {
  CASH = 'cash',
  TICKET = 'ticket',
  COUPON = 'coupon',
  PHYSICAL = 'physical'
}

export interface Prize {
  id: string;
  name: string;
  type: PrizeType;
  image: string;
  description?: string;
  probability?: number; // 中奖概率
  stock?: number; // 库存
  value?: number; // 价值
  status: 'available' | 'soldout' | 'inactive';
}

export interface PrizeListResponse {
  total: number;
  list: Prize[];
} 