export enum RewardType {
  CASH = 'cash',
  TICKET = 'ticket'
}

export enum CurrencyType {
  CNY = 'CNY',
  USD = 'USD',
  HKD = 'HKD'
}

export interface RewardRecord {
  id: string;
  continuousDays: number;
  type: RewardType;
  amount: number;
  currency?: CurrencyType;
  createTime: number;
  description: string;
  status: 'pending' | 'success' | 'failed';
} 