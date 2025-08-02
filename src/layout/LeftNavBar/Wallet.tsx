import { CloseOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { message, Modal, Select, Spin, Tabs } from "antd";
import { t } from "i18next";
import { forwardRef, ForwardRefRenderFunction, memo, useEffect, useState } from "react";

import {
  getExchangeRate,
  getWalletBalance,
  getWalletBalanceGroupByOrg,
  RechargeBalance,
  selectAllOrg,
} from "@/api/login";
import CurrencyList from "@/pages/walletForm/CurrencyList";
import TransactionHistory from "@/pages/walletForm/TransactionHistory";
import { getChatToken } from '@/utils/storage';
import { OverlayVisibleHandle, useOverlayVisible } from "../../hooks/useOverlayVisible";
import { IMSDK } from "../MainContentWrap";

const Wallet: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (_, ref) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const [balance, setBalance] = useState<number>(0);
  const [tokenInfo, setTokenInfo] = useState<any[]>([]);
  const [orgList, setOrgList] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(
    localStorage.getItem("current_org_id"),
  );
  const [currencyOptions, setCurrencyOptions] = useState<any[]>([]);

  // 将汇率数据转换为Select组件的options
  const convertRatesToOptions = (rates: Record<string, number>) => {
    return Object.entries(rates).map(([currency, rate]) => {
      return {
        value: currency,
        label: currency,
        rate: rate,
      };
    });
  };
  useEffect(() => {
    initOrg();
  }, []);

  const initOrg = async () => {
    const chatToken = await getChatToken();
    if (!chatToken) {
      return;
    }
    selectAllOrg().then((res) => {
      const allOrg = res.data.data;
      const tmpList = allOrg.map((v) => {
        return {
          label: v.organization.name,
          value: v.organization.id,
        };
      });
      setOrgList(tmpList);
    });
  };
  useEffect(() => {
    const fetchBalance = async () => {
      // try {
      //   const {
      //     data: { total_balance_usd, wallet_balance },
      //   } = await getWalletBalance();
      //
      // } catch (err) {
      //   message.error("Failed to fetch balance");
      // }

      try {
        const {
          data: { total_balance_usd, currency },
        } = await getWalletBalanceGroupByOrg(selectedOrgId);
        const wallet_balance = currency.map((v) => {
          return {
            ...v.balance_info,
            wallet_currency: v.currency_info,
          };
        });
        setBalance(total_balance_usd);
        setTokenInfo(wallet_balance);
      } catch (err) {
        // message.error("Failed to fetch balance");
      }
    };

    const fetchExchangeRate = async () => {
      try {
        const { data } = await getExchangeRate();
        delete data.rates.BTC;
        const currencyOptions = convertRatesToOptions(data.rates);
        setCurrencyOptions(currencyOptions);
      } catch (err) {
        // message.error("Failed to fetch exchange rate");
      }
    };

    if (isOverlayOpen) {
      fetchBalance();
      fetchExchangeRate();
    }
  }, [isOverlayOpen, selectedOrgId]);

  return (
    <Modal
      title={null}
      footer={null}
      closable={false}
      open={isOverlayOpen}
      centered
      onCancel={closeOverlay}
      styles={{
        mask: {
          opacity: 0,
          transition: "none",
        },
      }}
      width={680}
      className="no-padding-modal"
      maskTransitionName=""
      destroyOnHidden={true}
    >
      <WalletContent
        closeOverlay={closeOverlay}
        selectedOrgId={selectedOrgId}
        setSelectedOrgId={setSelectedOrgId}
        orgList={orgList}
        balance={balance}
        setBalance={setBalance}
        isOverlayOpen={isOverlayOpen}
        tokenInfo={tokenInfo}
        currencyOptions={currencyOptions}
      />
    </Modal>
  );
};

export default memo(forwardRef(Wallet));

export const WalletContent = ({
  closeOverlay,
  balance,
  setBalance,
  isOverlayOpen,
  tokenInfo,
  currencyOptions,
  selectedOrgId,
  setSelectedOrgId,
  orgList,
}: {
  closeOverlay?: () => void;
  balance: number;
  setBalance: (balance: number) => void;
  isOverlayOpen: boolean;
  tokenInfo: any[];
  currencyOptions: any[];
  selectedOrgId: string;
  setSelectedOrgId: React.Dispatch<React.SetStateAction<string>>;
  orgList: any[];
}) => {
  const [progress, setProgress] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("CNY");
  const [displayBalance, setDisplayBalance] = useState<number>(balance);
  const [convertedTokenInfo, setConvertedTokenInfo] = useState<any[]>(tokenInfo);
  const [currentRate, setCurrentRate] = useState<number>(1);

  const { loading, runAsync } = useRequest(IMSDK.uploadLogs, {
    manual: true,
  });

  const [activeTab, setActiveTab] = useState<string>("assets");

  // 当balance或者selectedCurrency发生变化时，更新显示的余额
  useEffect(() => {
    if (selectedCurrency === "USD") {
      setDisplayBalance(balance);
      setConvertedTokenInfo(tokenInfo);
    } else {
      const rate =
        currencyOptions.find((option) => option.value === selectedCurrency)?.rate || 1;
      setCurrentRate(rate);

      // 更新总余额显示
      const convertedBalance = balance * rate;
      setDisplayBalance(parseFloat(convertedBalance.toFixed(2)));

      // 更新每个资产的余额
      if (tokenInfo && tokenInfo.length > 0) {
        const newTokenInfo = tokenInfo.map((item) => ({
          ...item,
          balance_to_usd: parseFloat((item.balance_to_usd * rate).toFixed(2)),
        }));
        setConvertedTokenInfo(newTokenInfo);
      }
    }
  }, [balance, selectedCurrency, tokenInfo, currencyOptions]);

  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case "USD":
      case "AUD":
      case "CAD":
      case "HKD":
      case "SGD":
      case "NZD":
      case "MXN":
        return "$";
      case "CNY":
      case "JPY":
        return "¥";
      case "USDT":
        return "₮";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "INR":
        return "₹";
      case "RUB":
        return "₽";
      case "KRW":
        return "₩";
      case "TRY":
        return "₺";
      case "BRL":
        return "R$";
      case "THB":
        return "฿";
      case "CHF":
        return "Fr";
      case "ZAR":
        return "R";
      case "SEK":
      case "NOK":
      case "DKK":
        return "kr";
      case "ILS":
        return "₪";
      case "PLN":
        return "zł";
      case "PHP":
        return "₱";
      case "AED":
        return "د.إ";
      case "SAR":
        return "﷼";
      case "VND":
        return "₫";
      case "IDR":
        return "Rp";
      case "MYR":
        return "RM";
      case "CZK":
        return "Kč";
      case "HUF":
        return "Ft";
      case "UAH":
        return "₴";
      case "BTC":
        return "₿";
      case "ETH":
        return "Ξ";
      default:
        return "$";
    }
  };

  const changeCurrency = async (value: string) => {
    setSelectedCurrency(value);
    try {
      const { data } = await getExchangeRate();
      const rate = data.rates[value] || 1;
      setCurrentRate(rate);

      // 根据汇率计算总资产
      const convertedBalance = balance * rate;
      setDisplayBalance(parseFloat(convertedBalance.toFixed(2)));

      // 更新每个资产的折算金额
      if (tokenInfo && tokenInfo.length > 0) {
        const newTokenInfo = tokenInfo.map((item) => ({
          ...item,
          balance_to_usd: parseFloat((item.balance_to_usd * rate).toFixed(2)),
        }));
        setConvertedTokenInfo(newTokenInfo);
      }
    } catch (err) {
      // message.error("Failed to fetch exchange rate");
    }
  };

  const tabItems = [
    {
      key: "assets",
      label: t("placeholder.assets"),
      children: (
        <CurrencyList
          tokenInfo={tokenInfo}
          currentCurrency={selectedCurrency}
          currentRate={currentRate}
        />
      ),
    },
    {
      key: "transactions",
      label: t("placeholder.transactionHistory"),
      children: <TransactionHistory isOverlayOpen={isOverlayOpen} selectedOrgId={selectedOrgId} />,
    },
  ];

  return (
    <Spin spinning={loading} tip={`${progress}%`}>
      <div className="bg-[var(--chat-bubble)]">
        <div className="app-drag flex items-center justify-between bg-[var(--gap-text)] p-5">
          <span className="text-base font-medium">{t("placeholder.wallet")}</span>
          <CloseOutlined
            className="app-no-drag cursor-pointer text-[#8e9aaf]"
            rev={undefined}
            onClick={closeOverlay}
          />
        </div>

        {/* 总资产折合区域 */}
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">{t("placeholder.totalAssets")}</div>
            <div className="flex items-center">
              <Select
                value={selectedOrgId}
                onChange={setSelectedOrgId}
                suffixIcon={
                  <DownOutlined className="text-xs text-gray-400" rev={undefined} />
                }
                className="w-[180px]"
                options={orgList}
                showSearch
              />
              <Select
                value={selectedCurrency}
                onChange={changeCurrency}
                // bordered={false}
                suffixIcon={
                  <DownOutlined className="text-xs text-gray-400" rev={undefined} />
                }
                className="w-[80px]"
                dropdownStyle={{ minWidth: "80px" }}
                options={currencyOptions}
                showSearch
              />
            </div>
          </div>
          <div className="my-2 text-4xl font-bold">
            {getCurrencySymbol(selectedCurrency)}
            {displayBalance}
          </div>
        </div>
        <div className="mt-4">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            centered
          // className="px-5"
          />
        </div>
      </div>
    </Spin>
  );
};
