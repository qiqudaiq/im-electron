import "./TranHis.css";

import { Avatar, List, Select } from "antd";
import React, { useEffect, useState } from "react";
import { t } from "i18next";
import { getTokenInfo, GetTransactionDetail } from "@/api/login";

interface TransactionItem {
  id: string;
  type: number;
  amount: string;
  created_at: string;
  status: number;
  to_user_id: string;
  from_user_id: string;
}

interface TransactionResponse {
  data: {
    list: TransactionItem[];
    total: number;
    data: TransactionItem[];
  };
}

interface CurrencyOption {
  value: string;
  label: string;
}

const TransactionHistory = ({ isOverlayOpen, selectedOrgId }: { isOverlayOpen: boolean, selectedOrgId: string }) => {
  const [dataSource, setDataSource] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<number | null>(0);
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);

  // 获取币种列表
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await getTokenInfo();

        if (response?.data) {
          const currencies = response.data.data as any[];
          const options: CurrencyOption[] = currencies
            .map((currency: any) => ({
              value: currency.id,
              label: currency.name,
              orgId: currency.creator_id,
            }))
            .filter((item) => item.orgId === selectedOrgId)

          setCurrencyOptions(options);
          setFilterCurrency(options[0]?.value);

        }
      } catch (error) {
        console.error("获取币种列表失败:", error);
      }
    };

    if (isOverlayOpen) {
      fetchCurrencies();
    }
  }, [isOverlayOpen, selectedOrgId]);

  // 获取交易数据
  useEffect(() => {
    const getTsData = async () => {
      setLoading(true);
      try {
        const params: any = {
          page: currentPage,
          pageSize: 5,
          order: "created_at",
        };

        // 当不是"全部"时才添加 type 参数
        if (filterType !== 0) {
          params.type = filterType;
        }

        // 添加币种过滤
        if (filterCurrency !== "all") {
          params.currency_id = filterCurrency;
        }

        const res = (await GetTransactionDetail(
          params,
        )) as unknown as TransactionResponse;
        if (res?.data) {
          setDataSource(res.data.data || []);
          console.log(res.data.data, "jiqweqweojoi");
          setTotal(res.data.total || 0);
        }
      } catch (error) {
        console.error("获取交易记录失败:", error);
      } finally {
        setLoading(false);
      }
    };
    getTsData();
  }, [filterType, currentPage, filterCurrency]);

  useEffect(() => {
    if (isOverlayOpen) {
      setCurrentPage(1);
      setFilterType(0);
      // setFilterCurrency("all");
    }
  }, [isOverlayOpen]);

  // 获取交易类型对应的文本
  const getTransactionTypeText = (type: number) => {
    const typeMap: Record<number, string> = {
      1: t('placeholder.TransferExpense'),
      2: t('placeholder.TransferRefund'),
      3: t('placeholder.TransferReceipt'),
      11: t('placeholder.RedPacketRefund'),
      12: t('placeholder.RedPacketExpense'),
      13: t('placeholder.RedPacketReceipt'),
      21: t('placeholder.Recharge'),
      22: t('placeholder.Withdrawal'),
      23: t('placeholder.Consumption'),
      41: t('placeholder.SignInRewardExpense'),
      42: t('placeholder.SignInRewardReceive'),
    };
    return typeMap[type] || "未知类型";
  };

  return (
    <div className="TranHis-box" style={{ padding: 10 }}>
      <div
        className="header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: "bold" }}>{t('placeholder.BillingRecord')}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Select
            style={{ width: 120 }}
            value={filterCurrency}
            onChange={(value) => {
              setFilterCurrency(value);
              setCurrentPage(1);
            }}
            options={currencyOptions}
          />
          <Select
            style={{ width: 150 }}
            value={filterType}
            onChange={(value) => {
              setFilterType(value);
              setCurrentPage(1);
            }}
            options={[
              { value: 0, label: t('placeholder.All') },
              { value: 1, label: t('placeholder.TransferExpense') },
              { value: 2, label: t('placeholder.TransferRefund') },
              { value: 3, label: t('placeholder.TransferReceipt') },
              { value: 11, label: t('placeholder.RedPacketRefund') },
              { value: 12, label: t('placeholder.RedPacketExpense') },
              { value: 13, label: t('placeholder.RedPacketReceipt') },
              { value: 21, label: t('placeholder.Recharge') },
              { value: 22, label: t('placeholder.Withdrawal') },
              { value: 23, label: t('placeholder.Consumption') },
              { value: 41, label: t('placeholder.SignInRewardExpense') },
              { value: 42, label: t('placeholder.SignInRewardReceive') },
            ]}
          />
        </div>
      </div>

      <List
        loading={loading}
        pagination={{
          position: "bottom",
          align: "center",
          current: currentPage,
          pageSize: 5,
          total: total,
          showSizeChanger: false,
          onChange: (page) => setCurrentPage(page),
        }}
        dataSource={dataSource}
        renderItem={(item, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar
                  src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${index}`}
                />
              }
              title={<div>{getTransactionTypeText(item.type)}</div>}
              description={
                <span>{t('placeholder.Date')}: {new Date(item.created_at).toLocaleString()}</span>
              }
            />
            <div
              style={{
                color:
                  item.type === 3 || item.type === 13 || item.type === 21
                    ? "#52c41a"
                    : "#ff4d4f",
              }}
            >
              {item.type === 3 || item.type === 13 || item.type === 21 ? "+" : ""}
              {item.amount}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default TransactionHistory;
