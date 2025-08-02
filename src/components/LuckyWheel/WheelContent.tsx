import React, { useEffect, useState } from "react";
import { Button, message, Modal } from "antd";
import { t } from "i18next";
import styles from "./wheel-content.module.scss";
import type { Prize } from "./types";
import { lottery_user_ticket_use, lotteryDetail } from "@/api/login";
import Turntable from 'turntable-react';
import Pointer from '../../assets/images/pointer.png'
import PointerGift from '../../assets/images/gift.png'
import PointerTitle from '../../assets/images/img_v3_02np_3bbcdc45-c022-4f39-9473-88ebfc7881hu.png'

// 生成随机颜色
const getRandomColor = (index:number) => {
  const colors = [
    "#FF8C8C",
    "#FFC773",
    "#95D881",
    "#73C0DE",
    "#9D95FF",
    "#FF9C6E",
    "#FFB7B7",
    "#FFD700",
    "#98FB98",
    "#87CEEB",
    "#DDA0DD",
    "#F08080",
  ];
  return colors[index];
};

interface WheelContentProps {
  id: string;
  lottery_ticket_id: string;
  onComplete?: (prize: any) => void;
  onClose: () => void;
  params?: any;
}

interface WheelData {
  id: string;
  texts: {
    text: string;
    fontStyle: string;
    fontColor: string;
    fromCenter: number;
  }[];
  background: string;
  images?: {
    src: string;
    width: number;
    height: number;
    fromCenter: number;
    img?: string;

  }[];
}

interface LotteryResponse {
  data: {
    id: string;
    lottery_config: Array<{
      id: string;
      left: string;
      right: string;
      lottery_reward_info: {
        name: string;
        img?: string;
      };
    }>;
  };
}

const WheelContent = ({
  lottery_ticket_id,
  id,
  onComplete,
  onClose,
  params = null,
}: WheelContentProps) => {
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [prizes, setPrizes] = useState<WheelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUsed, setHasUsed] = useState(false);

  
  useEffect(() => {
    const fetchPrizes = async () => {
      try {
        setLoading(true);
        const response = await lotteryDetail({  ...params,id: lottery_ticket_id, });
        const lotteryData = response as LotteryResponse;

        if (lotteryData?.data?.lottery_config) {
          let totalProbability = 0;
          const probMap: Record<string, number> = {};

          const formattedPrizes = lotteryData.data.lottery_config.map((config, index) => {
            const probability = parseInt(config.right) - parseInt(config.left);
            totalProbability += probability;
            probMap[config.id] = probability;

            return {
              id: config.id,
              texts: [
                {
                  text: config.lottery_reward_info.name,
                  fontStyle: '13px Arial',
                  fontColor: 'rgba(70, 47, 47, 1)',
                  fromCenter: 0.8,
                }
                // {
                //   text: config.lottery_reward_info.name,
                //   fontStyle: '13px Arial',
                //   fontColor: 'rgba(70, 47, 47, 1)',
                //   fromCenter: 0.68,
                // }
              ],
              background: getRandomColor(index),
              images: config.lottery_reward_info.img ? [
                {
                  src: PointerGift,
                  img:config.lottery_reward_info.img,
                  width: 30,
                  height: 30,
                  fromCenter: 0.65,
                }
              ] : undefined
            };
          });

          // 如果总概率小于100，添加"谢谢参与"选项
          if (totalProbability < 100) {
            const thankYouPrize = {
              id: "thank_you",
              texts: [
                {
                  text: t("placeholder.thankYou"),
                  fontStyle: '13px Arial',
                  fontColor: 'rgba(70, 47, 47, 1)',
                  fromCenter: 0.8,
                }
                // {
                //   text: t("placeholder.thankYou"),
                //   fontStyle: '13px Arial',
                //   fontColor: 'rgba(70, 47, 47, 1)',
                //   fromCenter: 0.68,
                // }
              ],
              background: '#FFFFFF',
              images: undefined
            };
            formattedPrizes.push(thankYouPrize);
            probMap["thank_you"] = 100 - totalProbability;
          }

          setPrizes(formattedPrizes);
        }
      } catch (error) {
        console.error("获取奖品列表失败:", error);
        message.error(t("placeholder.getPrizesError"));
      } finally {
        setLoading(false);
      }
    };

    if(id){
      fetchPrizes();
    }
  }, [id]);




  const handleCloseResult = () => {
    setShowResult(false);
    onClose();
  };
  


  const fetchPrizeResult = (abort: () => void) => {
    if (spinning) {
      return false;
    }
    
    if (hasUsed) {
      message.warning(t("placeholder.used"));
      return false;
    }

    return new Promise<number>((resolve, reject) => {
      lottery_user_ticket_use({ ...params, lottery_ticket_id: id })
        .then((res) => {
          if (res?.data) {
            let winningId = "thank_you";

            if (res.data.reward_config && res.data.reward_config.id) {
              winningId = res.data.reward_config.id;
            }

            const winIndex = prizes.findIndex((prize) => prize.id === winningId);

            
            if (winIndex !== -1) {
              setPrizeNumber(winIndex);
              setSpinning(true);
              setHasUsed(true);
              resolve(winIndex);
              return;
            }
          }
          message.error(t("placeholder.lotteryError"));
          abort();
          reject();
        })
        .catch((error) => {
          console.error("使用奖券失败:", error);
          message.error(t("placeholder.lotteryError"));
          abort();
          reject();
        });
    });
  };

  const complete = (index: number) => {
    if (!prizes[index]) return;
    setSpinning(false);
    setShowResult(true);
    onComplete?.(prizes[index]);
  };

  const timeout = () => {
    setSpinning(false);
    message.error(t("placeholder.lotteryError"));
  };

  const stateChange = (drawing: boolean) => {
    setSpinning(drawing);
  };




  const renderResultContent = () => {
    const prize = prizes[prizeNumber];

    
    if (prize.id === "thank_you") {
      return (
        <div className={styles.resultContent}>
          <div className={styles.resultIcon}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="40" cy="40" r="38" stroke="#FF6B6B" strokeWidth="4" />
              <path
                d="M28 52C34.6667 45.3333 45.3333 45.3333 52 52"
                stroke="#FF6B6B"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="28" cy="32" r="4" fill="#FF6B6B" />
              <circle cx="52" cy="32" r="4" fill="#FF6B6B" />
            </svg>
          </div>
          <h2 className={styles.resultTitle}>{t("placeholder.noLuck")}</h2>
          <p className={styles.resultText}>{t("placeholder.tryNextTime")}</p>
        </div>
      );
    }

    return (
      <div className={styles.resultContent}>
        <div className={styles.resultIcon}>
          {prize.images ? (
            <img src={prize.images[0].img} width={160} height={160} />
          ) : (
            <svg
              width="100"
              height="100"
              viewBox="0 0 80 80"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="40" cy="40" r="38" stroke="#4CAF50" strokeWidth="4" />
              <path
                d="M28 45C34.6667 51.6667 45.3333 51.6667 52 45"
                stroke="#4CAF50"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="28" cy="32" r="4" fill="#4CAF50" />
              <circle cx="52" cy="32" r="4" fill="#4CAF50" />
            </svg>
          )}
        </div>
        <h2 className={styles.resultTitle}>{t("placeholder.congratulations")}</h2>
        <p className={styles.resultText}>
          {t("placeholder.prizeWon", { prize: prize.texts[0].text })}
        </p>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>{t("placeholder.loading")}</div>;
  }

  return (
    <div className={styles.wheelContent}>
      {/* <h1 className={styles.title}>{t("placeholder.luckyWheel")}</h1> */}
      <img src={PointerTitle} className="h-[160px] mt-[30px]"/>

      <div className={styles["turntable"]}>
        <Turntable
          size={268}
          prizes={prizes}
          onStart={fetchPrizeResult}
          onComplete={complete}
          onTimeout={timeout}
          onStateChange={stateChange}
        >
          <div className={styles["turntable-pointer"]}>
            <img className={styles["pointer-img"]} src={Pointer} alt="" />
          </div>
        </Turntable>
      </div>

     

      <Modal
        open={showResult}
        onCancel={handleCloseResult}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseResult}>
            {t("confirm")}
          </Button>,
        ]}
        centered
        className={styles.resultModal}
      >
        {renderResultContent()}
      </Modal>
    </div>
  );
};

export default WheelContent;
