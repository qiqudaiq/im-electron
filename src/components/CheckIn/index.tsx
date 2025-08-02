import React, { useState, useEffect, useRef } from "react";
import { Calendar, Button, message, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import locale from "antd/es/date-picker/locale/zh_CN";

import { t } from "i18next";
import VerifyForWallet from "@/layout/LeftNavBar/VerifyForWallet";
import type { OverlayVisibleHandle } from "@/hooks/useOverlayVisible";
import styles from "./index.module.scss";
import AnimatedCard from "../AnimatedCard";
import RewardsModal from "../RewardsModal";
import { getChatToken } from "@/utils/storage";
import { checkInCreate, checkinDetail, checkWalletExist } from "@/api/login";
import SignIn from "../../../public/icons/sign-in.svg";
import Reward from "../../../public/icons/reward.svg";

interface CheckInRecord {
  date: string;
  checked: boolean;
}

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

interface LotteryInfo {
  id: string;
  name: string;
  icon: string;
  // 其他抽奖券相关信息
}

interface CheckInReward {
  id: string;
  im_server_user_id: string;
  type: "lottery" | "cash" | "integral";
  amount: number;
  reward_currency_info?: RewardCurrencyInfo;
  reward_lottery_info?: LotteryInfo;
}

interface RewardInfo {
  type: "lottery" | "cash" | "integral";
  amount: number;
  name?: string;
  icon?: string;
}

const CheckIn: React.FC = () => {
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [continuousDays, setContinuousDays] = useState(0);
  const walletVerifyRef = useRef<OverlayVisibleHandle>(null);
  const [showCard, setShowCard] = useState(false);
  const [rewardInfos, setRewardInfos] = useState<RewardInfo[]>([]);

  useEffect(() => {
    const now = dayjs();
    const startTime = now.startOf("month").unix();
    const endTime = now.endOf("month").unix();
    bindCheckinDetail(startTime, endTime);
  }, []);

  const bindCheckinDetail = async (startTime: number, endTime: number) => {
    try {
      const { data: response } = (await checkinDetail({
        startTime,
        endTime,
      })) as any;

      if (response?.checkin_record) {
        // 将签到记录转换为本地格式
        const records: CheckInRecord[] = response?.checkin_record?.map(
          (checkin: any) => ({
            date: dayjs(checkin.date).format("YYYY-MM-DD"),
            checked: true,
          }),
        );
        setCheckInRecords(records);
      }

      // 使用后端返回的 streak 值
      setContinuousDays(response?.streak||0);

      // 检查今天是否已经签到
      const hasCheckedToday = response?.today_checkin !== null;
      setCanCheckIn(!hasCheckedToday);
    } catch (error) {
      console.error("获取签到记录失败:", error);
    }
  };

  const handleCheckIn = async () => {
    try {
      const token = (await getChatToken()) as string;
      const { data } = await checkWalletExist(token);

      if (!data) {
        Modal.confirm({
          title: t("placeholder.wallet"),
          content: t("toast.toCreateWallet"),
          okText: t("confirm"),
          cancelText: t("cancel"),
          onOk: () => {
            setIsModalOpen(false);
            walletVerifyRef.current?.openOverlay();
          },
        });
        return;
      }

      const { data: response } = (await checkInCreate()) as any;
      const rewards = response.checkin_rewards || [];

      // 处理签到奖励
      const newRewards: RewardInfo[] = [];
      rewards.forEach((reward: CheckInReward) => {
        if (reward.type === "cash" && reward.reward_currency_info) {
          newRewards.push({
            type: "cash",
            amount: reward.amount,
            name: reward.reward_currency_info.name,
            icon: reward.reward_currency_info.icon,
          });
        } else if (reward.type === "lottery" && reward.reward_lottery_info) {
          newRewards.push({
            type: "lottery",
            amount: reward.amount,
            name: reward.reward_lottery_info.name,
            icon: reward.reward_lottery_info.icon,
          });
        } else if (reward.type === "integral") {
          newRewards.push({
            type: "integral",
            amount: reward.amount,
            name: "integral",
          });
        }
      });

      setRewardInfos(newRewards);

      // 更新签到状态
      const today = dayjs().format("YYYY-MM-DD");
      const newRecord = { date: today, checked: true };
      const updatedRecords = [...checkInRecords, newRecord];
      setCheckInRecords(updatedRecords);
      setContinuousDays((prev) => prev + 1);
      setShowCard(true);
      setCanCheckIn(false);

      message.success(t("toast.checkinSuccess"));
    } catch (error) {
      console.error("签到失败:", error);
      message.error(t("toast.checkinFailed"));
    }
  };

  const dateFullCellRender = (value: Dayjs) => {
    const date = value.format("YYYY-MM-DD");
    const isChecked = checkInRecords.some(
      (record) => record.date === date && record.checked,
    );

    const today = dayjs().format("YYYY-MM-DD");
    const isToday = date === today;

    return (
      <div
        className={`ant-picker-cell-inner ${styles.dateCell} ${
          isChecked ? styles.checkedDate : ""
        }`}
        style={{
          position: "relative",
          height: "100%",
          padding: "4px",
          backgroundColor: isChecked ? "#e6f4ff" : "transparent",
          borderRadius: "4px",
        }}
      >
        {(isChecked || (isToday && !isChecked)) && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2">
            {isChecked ? (
              <img src={SignIn} alt="" className="h-5 w-5" />
            ) : (
              <div className="h-2 w-2 rounded-full border border-blue-400"></div>
            )}
          </div>
        )}
        <div
          className={`text-center ${
            isChecked || (isToday && !isChecked) ? "ml-7 mr-2" : ""
          }`}
        >
          {value.date()}
        </div>
      </div>
    );
  };

  const onPanelChange = (date: Dayjs) => {
    // 当切换月份时，重新获取该月的签到记录
    const startTime = date.startOf("month").unix();
    const endTime = date.endOf("month").unix();

    bindCheckinDetail(startTime, endTime);
  };

  const cardContent = (
    <div className={styles.cardContent}>
      <div className={styles.cardIcon}>
        <img src="/20250625-104203.png" alt={t("checkin.success")} />
      </div>

      <div className="mb-2 text-xl font-medium text-gray-600">
        {t("checkin.success")}
      </div>

      {rewardInfos.length > 0 && (
        <div className={styles.cardTip}>
          {rewardInfos.map((reward, index) => (
            <div key={index} className="mb-1 text-base text-gray-500">
              {reward.type === "cash" && (
                <>
                  {t("checkin.cashReward")}: {reward.amount} {reward.name}
                </>
              )}
              {reward.type === "integral" && (
                <>
                  {t("checkin.integralReward")}: {reward.amount}
                </>
              )}
              {reward.type === "lottery" && (
                <>
                  {t("checkin.rewardTip", {
                    type: reward.name,
                    name: "",
                    amount: reward.amount,
                  })}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        type="primary"
        size="large"
        className="my-6 h-[48px] w-[200px] text-base"
        onClick={() => setShowCard(false)}
      >
        {t("placeholder.complete")}
      </Button>
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="small"
          onClick={() => setIsModalOpen(true)}
          className="transition-colors hover:border-blue-500 hover:text-blue-500"
        >
          <div className="flex items-center gap-1">
            <img src={SignIn} className="h-4" />
            <span>{t("checkin.checkIn")}</span>
          </div>
        </Button>
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2 text-lg font-medium">
            <span>{t("checkin.title")}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button
            key="close"
            onClick={() => setIsModalOpen(false)}
            className="hover:border-gray-500 hover:text-gray-500"
          >
            {t("close")}
          </Button>,
          <Button
            key="checkIn"
            type="primary"
            onClick={handleCheckIn}
            disabled={!canCheckIn}
          >
            {canCheckIn ? t("checkin.checkIn") : t("checkin.checked")}
          </Button>,
        ]}
        width={800}
        className="calendar-modal"
      >
        <div className="relative rounded-lg bg-gray-50 p-6">
          <div className="flex flex-row justify-between">
            <div className=""></div>
            <div className="mb-4 flex flex-1 flex-col justify-center text-center">
              <div className="text-lg font-medium text-gray-600">
                {t("checkin.continuousDays")}
              </div>
              <div className="mt-2 flex items-center justify-center gap-4">
                <div>
                  <span className="text-3xl font-bold text-blue-500">
                    {continuousDays}
                  </span>
                  <span className="ml-2 text-gray-500">{t("checkin.days")}</span>
                </div>
              </div>
            </div>
            <Button
              size="small"
              onClick={() => setIsRewardsModalOpen(true)}
              className="hover:border-gold-500 hover:text-gold-500 absolute right-3 top-3 transition-colors"
            >
              <div className="flex items-center gap-1">
                <img src={Reward} alt={t("checkin.myRewards")} className="h-4" />
                <span>{t("checkin.myRewards")}</span>
              </div>
            </Button>
          </div>

          <Calendar
            locale={locale}
            fullscreen={false}
            dateFullCellRender={dateFullCellRender}
            onPanelChange={onPanelChange}
            className="rounded-lg bg-white shadow-sm"
            disabledDate={() => true}
            mode="month"
          />
        </div>
      </Modal>

      <VerifyForWallet ref={walletVerifyRef} />

      <AnimatedCard
        visible={showCard}
        onClose={() => setShowCard(false)}
        frontContent={
          <div className={styles.cardFront}>
            <img src="/favicon.ico" alt="logo" width={200} height={200} />
          </div>
        }
      >
        {cardContent}
      </AnimatedCard>

      <RewardsModal
        open={isRewardsModalOpen}
        onClose={() => setIsRewardsModalOpen(false)}
      />

      <style jsx global>{`
        .ant-picker-calendar-mode-switch {
          display: none !important;
        }
      `}</style>
    </>
  );
};

export default CheckIn;
