import React, { useState, useEffect } from "react";
import {
  Modal,
  Table,
  Tag,
  Empty,
  Select,
  DatePicker,
  Space,
  Form,
  Input,
  Image,
} from "antd";
import { t } from "i18next";
import dayjs from "dayjs";
import type { TableProps } from "antd";
import styles from "./index.module.scss";
import { lottery_user_recordList } from "@/api/login";

const { RangePicker } = DatePicker;

interface LotteryRecord {
  id: string;
  lottery_id: string;
  is_win: boolean;
  status: number;
  win_time: number;
  prize_name: string;
  prize_type: string;
  prize_value: string;
  prize_image: string;
}

interface FilterParams {
  lottery_id: string;
  is_win: boolean;
  status: number;
  win_start_time: number;
  win_end_time: number;
}

interface PrizesModalProps {
  open: boolean;
  onClose: () => void;
}

const PrizesModal: React.FC<PrizesModalProps> = ({ open, onClose }) => {
  const [prizes, setPrizes] = useState<LotteryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });
  const [filterParams, setFilterParams] = useState<FilterParams>({
    lottery_id: "",
    is_win: true,
    status: 0,
    win_start_time: 0,
    win_end_time: 0,
  });

  const fetchPrizes = async (page: number, pageSize: number, params: FilterParams) => {
    setLoading(true);
    try {
      const response = (await lottery_user_recordList({
        lottery_id: params.lottery_id,
        is_win: params.is_win,
        status: params.status,
        win_start_time: params.win_start_time,
        win_end_time: params.win_end_time,
        pagination: {
          page: page,
          page_size: pageSize,
          order: "win_time desc",
        },
      })) as any;

      if (response?.data) {
        setPrizes(response.data.data || []);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: response.data.total || 0,
        }));
      }
    } catch (error) {
      console.error("获取奖品记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPrizes(pagination.current, pagination.pageSize, filterParams);
    }
  }, [open, filterParams]);

  const handleTableChange: TableProps<LotteryRecord>["onChange"] = (pagination) => {
    fetchPrizes(pagination.current || 1, pagination.pageSize || 10, filterParams);
  };



  const handleStatusChange = (value: number) => {
    setFilterParams((prev) => ({
      ...prev,
      status: value,
    }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTimeChange = (dates: any) => {
    if (dates) {
      setFilterParams((prev) => ({
        ...prev,
        win_start_time: dates[0].unix(),
        win_end_time: dates[1].unix(),
      }));
    } else {
      setFilterParams((prev) => ({
        ...prev,
        win_start_time: 0,
        win_end_time: 0,
      }));
    }
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns: TableProps<LotteryRecord>["columns"] = [
    {
      title: '',
      dataIndex: ["reward_info", "img"],
      key: "prize_image",
      width: 80,
      render: (img: string) => (
        img ? (
          <Image
            src={img}
            alt="prize"
            width={60}
            height={60}
            style={{ objectFit: "cover" }}
    
        />):null
      ),
    },
    {
      title: t("placeholder.prize.name"),
      dataIndex: ["reward_info", "name"],
      key: "prize_name",
    },
    // {
    //   title: t("placeholder.prize.type"),
    //   dataIndex: ["reward_info", "type"],
    //   key: "prize_type",
    //   render: (type: string) => (
    //     <Tag color="blue">
    //       {type === "m"
    //         ? t("placeholder.prize.virtual")
    //         : t("placeholder.prize.entity")}
    //     </Tag>
    //   ),
    // },
    {
      title: t("placeholder.prize.remark"),
      dataIndex: ["reward_info", "remark"],
      key: "remark",
      ellipsis: true,
    },
    {
      title: t("placeholder.status"),
      dataIndex: "status",
      key: "status",
      render: (status: number) => (
        <Tag color={status === 1 ? "green" : "orange"}>
          {status === 1
            ? t("placeholder.prizeStatus.received")
            : t("placeholder.prizeStatus.pending")}
        </Tag>
      ),
    },
    {
      title: t("placeholder.prize.winTime"),
      dataIndex: "win_time",
      key: "win_time",
      render: (time: string) => dayjs(time).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  return (
    <Modal
      title={t("placeholder.prize.myPrizes")}
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      centered
      destroyOnHidden
    >
      <div className={styles.filterContainer} style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
           
            
            <Form.Item
              label={t("placeholder.status")}
              style={{ width: "180px", marginBottom: 16 }}
            >
              <Select
                value={filterParams.status}
                onChange={handleStatusChange}
                options={[
                  { value: 0, label: t("placeholder.pending") },
                  { value: 1, label: t("placeholder.received") },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={t("placeholder.prize.winTime")}
              style={{  width: "220px", marginBottom: 16 }}
            >
              <RangePicker
                style={{ width: "100%" }}
                onChange={handleTimeChange}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </div>
        </Form>
      </div>
      <div className={styles.prizesContainer}>
        {prizes?.length > 0 ? (
          <Table
            columns={columns}
            dataSource={prizes}
            rowKey="id"
            pagination={pagination}
            onChange={handleTableChange}
            loading={loading}
          />
        ) : (
          <Empty description={t("placeholder.noPrizes")} />
        )}
      </div>
    </Modal>
  );
};

export default PrizesModal;
