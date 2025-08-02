import "./refundNotification.scss";

import { RightOutlined } from "@ant-design/icons";
import { MessageItem } from "@openim/wasm-client-sdk";
import { FC } from "react";
import { t } from "i18next";

interface RefundNotificationProps {
  message: MessageItem;
}

const RefundNotificationRenderer: FC<RefundNotificationProps> = ({ message }) => {
  const res = JSON.parse(message.notificationElem!.detail).refundElem;
  const { amount, currency, refundTime, refundType } = res;
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

  return (
    <div className="refund-notification">
      <div className="refund-title">{t('placeholder.RefundReceivedNotice')}</div>
      <div className="refund-content">
        <div className="refund-amount-container">
          <div className="amount-label">{t('placeholder.RefundAmount')}</div>
          <div className="refund-amount">
            <span className="currency">{getCurrencySymbol(currency)}</span>
            <span className="amount">{amount}</span>
          </div>
        </div>
        <div className="refund-details">
          <div className="detail-item">
            <span className="label">{t('placeholder.RefundType')}</span>
            <span className="value">{refundType === 2 ? t('placeholder.TransferRefund') : t('placeholder.RedPacketRefund')}</span>
          </div>
          <div className="detail-item">
            <span className="label">{t('placeholder.RefundMethod')}</span>
            <span className="value refund-method">{t('placeholder.RefundToWallet')}</span>
          </div>
          <div className="detail-item">
            <span className="label">{t('placeholder.ArrivalTime')}</span>
            <span className="value">
              {new Date(refundTime * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      {/* <div className="refund-footer">
        <span>查看退款详情</span>
        <span className="arrow">
          <RightOutlined style={{ fontSize: 12, color: "#999" }} />
        </span>
      </div> */}
    </div>
  );
};

export default RefundNotificationRenderer;
