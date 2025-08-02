import { t } from "i18next";
import { useRef } from "react";
import { Virtuoso } from "react-virtuoso";
import { VirtuosoHandle } from "react-virtuoso";

// 货币数据类型定义
interface CurrencyItem {
  id: string;
  symbol: string;
  value: number;
  color: string;
  name: string;
  rate?: {
    base: string;
    value: number;
  };
}

const CurrencyList = ({
  tokenInfo,
  currentCurrency = "CNY",
  currentRate,
}: {
  tokenInfo: any[];
  currentCurrency?: string;
  currentRate?: number;
}) => {
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

  const getCurrencyColor = (currencyName: string): string => {
    // 基础颜色映射
    const colorMap: Record<string, string> = {
      USD: "#3b82f6", // 蓝色
      CNY: "#ef4444", // 红色
      USDT: "#22c55e", // 绿色
      EUR: "#6366f1", // 紫色
      GBP: "#8b5cf6", // 紫蓝色
      JPY: "#f97316", // 橙色
      AUD: "#06b6d4", // 青色
      CAD: "#ec4899", // 粉色
      CHF: "#a855f7", // 紫罗兰
      HKD: "#14b8a6", // 青绿色
      SGD: "#f59e0b", // 琥珀色
      BTC: "#f7931a", // 比特币橙色
      ETH: "#627eea", // 以太坊蓝色
    };

    // 如果找到对应的颜色，返回该颜色，否则随机选择一个颜色
    if (colorMap[currencyName]) {
      return colorMap[currencyName];
    }
    const colorList = Object.values(colorMap);
    const randomIndex = Math.floor(Math.random() * colorList.length);
    return colorList[randomIndex];
  };

  return (
    <div style={{ width: "100%", height: "480px" }}>
      <Virtuoso
        style={{ height: "100%" }}
        data={tokenInfo}
        computeItemKey={(_, item) => item.id}
        itemContent={(_, currency) => {
          const currencyName = currency.wallet_currency.name;
          const color = getCurrencyColor(currencyName);
          return (
            <div className="px-4 py-2">
              <div className="rounded-xl p-4" style={{ backgroundColor: `${color}15` }}>
                <div className="mb-2 flex items-center">
                  <img
                    src={currency.wallet_currency.icon}
                    width={36}
                    height={36}
                    style={{ borderRadius: "50%" }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">
                    {currency.wallet_currency.name} ≈{" "}
                    {getCurrencySymbol(currentCurrency)}
                    {currency.balance_to_usd * currentRate}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {currency.available_balance} {currency.wallet_currency.name}
                </div>
                {/*{currency.wallet_currency.exchange_rate && (*/}
                {/*  <div className="mt-1 text-sm text-gray-500">*/}
                {/*    {t("placeholder.exchangeRate")}: 1 {currency.wallet_currency.name} ={" "}*/}
                {/*    {currentRate * currency.wallet_currency.exchange_rate}{" "}*/}
                {/*    {currentCurrency}*/}
                {/*  </div>*/}
                {/*)}*/}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

export default CurrencyList;
