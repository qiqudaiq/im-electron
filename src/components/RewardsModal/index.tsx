import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Empty } from 'antd';
import { t } from "i18next";
import dayjs from 'dayjs';
import type { TableProps } from 'antd';
import styles from './index.module.scss';
import { checkinRewardList } from '@/api/login';
import type { AxiosResponse } from 'axios';

interface RewardCurrencyInfo {
  id: string;
  name: string;
  icon: string;
  order: number;
  exchange_rate: string;
  min_available_amount: string;
  max_total_supply: number;
  max_red_packet_amount: string;
  creator_id: string;
  decimals: number;
  created_at: string;
  updated_at: string;
}

interface RewardRecord {
  id: string;
  im_server_user_id: string;
  checkin_reward_config_id: string;
  checkin_id: string;
  type: 'cash' | 'lottery' | 'integral';
  reward_id: string;
  amount: string;
  status: 'pending' | 'apply';
  created_at: string;
  updated_at: string;
  reward_currency_info: RewardCurrencyInfo | null;
  reward_lottery_info: any | null;
}



interface RewardsModalProps {
  open: boolean;
  onClose: () => void;
}

const RewardsModal: React.FC<RewardsModalProps> = ({ open, onClose }) => {
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 获取奖励记录
  const fetchRewards = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const response = await checkinRewardList({
        page: page,
        pageSize: pageSize
      }) as any;
      
      const res = response.data;
      
      
      if (res?.data) {
        setRewards(res.data);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: res.total
        }));
      }
    } catch (error) {
      console.error('获取奖励记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRewards(pagination.current, pagination.pageSize);
    }
  }, [open]);

  const handleTableChange: TableProps<RewardRecord>['onChange'] = (pagination) => {
    fetchRewards(pagination.current || 1, pagination.pageSize || 10);
  };

  const columns: TableProps<RewardRecord>['columns'] = [
    {
      title: t('placeholder.ticketType'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        let color = 'gold';
        let text = t('checkin.lotteryReward');
        
        if (type === 'cash') {
          color = 'green';
          text = t('checkin.cashReward');
        } else if (type === 'integral') {
          color = 'blue';
          text = t('checkin.integralReward');
        }
        
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: t('toast.rewardAmount'),
      key: 'amount',
      render: (_, record) => {
        if (record.type === 'cash' && record.reward_currency_info) {
          return `${record.amount} ${record.reward_currency_info.name}`;
        } else if (record.type === 'integral') {
          return `${record.amount} ${t('checkin.integral')}`;
        }
        return record.amount;
      }
    },
    {
      title: t('placeholder.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'apply' ? 'green' : 'orange'}>
          {status === 'apply' ? t('placeholder.received') : t('placeholder.pending')}
        </Tag>
      )
    },
    {
      title: t('placeholder.obtainTime'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')
    }
  ];

  return (
    <Modal
      title={t('checkin.myRewards')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      destroyOnHidden
    >
      <div className={styles.rewardsContainer}>
        {rewards?.length > 0 ? (
          <Table
            columns={columns}
            dataSource={rewards}
            rowKey="id"
            pagination={pagination}
            onChange={handleTableChange}
            loading={loading}
          />
        ) : (
          <Empty description={t('placeholder.noTickets')} />
        )}
      </div>
    </Modal>
  );
};

export default RewardsModal; 