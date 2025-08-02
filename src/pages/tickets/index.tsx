import React, {
  useState,
  useEffect,
  forwardRef,
  ForwardRefRenderFunction,
  memo,
} from "react";
import { Modal, Tabs, Empty, List, message, Button } from "antd";
import { t } from "i18next";
import dayjs from "dayjs";
import { TicketStatus, type Ticket, type TicketFilterType } from "@/types/ticket";
import { OverlayVisibleHandle, useOverlayVisible } from "@/hooks/useOverlayVisible";
import classNames from "classnames";
import styles from "./index.module.scss";
import LuckyWheel from "@/components/LuckyWheel";
import { lottery_user_ticketDetail } from "@/api/login";
import InfiniteScroll from "react-infinite-scroll-component";
import PrizesModal from "@/components/PrizesModal";

const { TabPane } = Tabs;

interface LotteryInfo {
  id: string;
  org_id: string;
  name: string;
  desc: string;
  valid_days: number;
  created_at: string;
  updated_at: string;
}

interface TicketData {
  id: string;
  im_server_user_id: string;
  lottery_id: string;
  use: boolean;
  used_at: string;
  expired_at: string;
  created_at: string;
  updated_at: string;
  lottery_info: LotteryInfo;
}

interface TicketResponse {
  total: number;
  data: TicketData[];
}

interface ITicket {
  id: string;
  lottery_id: string;
  name: string;
  description: string;
  createTime: number;
  expireTime: number;
  status: TicketStatus;
  type: string;
  colorIndex?: number;
}

// 工具函数
const getRemainingDays = (expireTime: number) => {
  const now = dayjs();
  const expireDate = dayjs.unix(expireTime);
  return Math.max(0, expireDate.diff(now, "day"));
};

const TicketCard = ({ ticket, onClick }: { ticket: ITicket; onClick: () => void }) => {
  const remainingDays = getRemainingDays(ticket.expireTime);
  const isExpired = remainingDays === 0 || ticket.status === TicketStatus.EXPIRED;

  return (
    <div
      className={classNames(styles.ticketCard, {
        [styles.expired]: isExpired,
        [styles.used]: ticket.status === TicketStatus.USED,
      })}
      onClick={onClick}
      data-color={ticket.colorIndex}
    >
      <div className={styles.ticketIcon}>
        {/* <span className={styles.ticketCount}>x 2</span> */}
      </div>
      <h3 className={styles.ticketName}>{ticket.name}</h3>
      <p className={styles.ticketDesc}>{ticket.description}</p>
      <div className={styles.ticketFooter}>
        {isExpired ? (
          <span className={styles.expiredTag}>{t("placeholder.expired")}</span>
        ) : (
          <span className={styles.expiryTime}>
            {remainingDays}
            {t("placeholder.daysRemaining")}
          </span>
        )}
        <button className={styles.useButton} disabled={isExpired}>
          {ticket.status === TicketStatus.USED
            ? t("placeholder.used")
            : t("placeholder.useNow")}
        </button>
      </div>
    </div>
  );
};

const TicketsModal: ForwardRefRenderFunction<OverlayVisibleHandle, unknown> = (
  _,
  ref,
) => {
  const { isOverlayOpen, closeOverlay } = useOverlayVisible(ref);
  const [info, setInfo]: any = useState(null);
  const [tickets, setTickets] = useState<ITicket[]>([]);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [isPrizesModalOpen, setIsPrizesModalOpen] = useState(false);

  const pageSize = 10;

  const fetchTickets = async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await lottery_user_ticketDetail({
        page: pageNum,
        pageSize: pageSize,
      });

      const ticketResponse = response?.data as unknown as TicketResponse;

      if (ticketResponse?.data) {
        const newTickets = ticketResponse.data.map((ticket) => ({
          id: ticket.id,
          lottery_id: ticket.lottery_id,
          name: ticket.lottery_info.name,
          description: ticket.lottery_info.desc,
          createTime: dayjs(ticket.created_at).unix(),
          expireTime: dayjs(ticket.expired_at).unix(),
          status: ticket.use ? TicketStatus.USED : TicketStatus.UNUSED,
          type:
            ticket.lottery_info.valid_days > 50
              ? t("placeholder.ticketTypes.reward")
              : t("placeholder.ticketTypes.coupon"),
          colorIndex: Math.floor(Math.random() * 8),
        }));

        if (pageNum === 1) {
          setTickets(newTickets);
        } else {
          setTickets((prev) => [...prev, ...newTickets]);
        }

        const total = ticketResponse.total || 0;
        const totalPages = Math.ceil(total / pageSize);
    
        setHasMore(pageNum < totalPages && newTickets.length > 0);
        setPage(pageNum);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("获取奖券列表失败:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOverlayOpen) {
      fetchTickets(1);
    }
  }, [isOverlayOpen]);

  const loadMoreData = () => {
    if (!loading && hasMore) {
      fetchTickets(page + 1);
    }
  };

  // 根据状态筛选奖券
  const getFilteredTickets = () => {
    return tickets;
  };

  const handleTicketClick = (ticket: ITicket) => {
    const remainingDays = getRemainingDays(ticket.expireTime);
    const isExpired = remainingDays === 0 || ticket.status === TicketStatus.EXPIRED;
    const isUsed = ticket.status === TicketStatus.USED;

    if (isExpired) {
      message.error(t("placeholder.ticketExpired"));
      return;
    }

    if (isUsed) {
      message.error(t("placeholder.ticketUsed"));
      return;
    }

    setInfo(ticket);
    setShowLuckyWheel(true);
  };

  return (
    <>
      <Modal
        title={null}
        open={isOverlayOpen}
        onCancel={closeOverlay}
        footer={null}
        width={800}
        centered
        destroyOnHidden
        className="no-padding-modal"
        styles={{
          mask: {
            opacity: 0,
            transition: "none",
          },
        }}
        maskTransitionName=""
      >
        <div className="bg-[var(--chat-bubble)]">
          <div className="app-drag flex items-center bg-[var(--gap-text)] p-5">
            <span className="text-base font-medium">{t("placeholder.myTickets")}</span>
            <div className="flex-1" />
            <Button 
              type="link" 
              onClick={() => setIsPrizesModalOpen(true)}
              className="mr-5 text-[var(--primary-text)]"
            >
              {t("placeholder.prizeList")}
            </Button>
          </div>

          <div className="max-h-[567px] overflow-auto p-6" id="ticketsScrollableDiv">
            <div>
              {tickets.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t("placeholder.noTickets")}
                />
              ) : (
                <InfiniteScroll
                  dataLength={tickets.length}
                  next={loadMoreData}
                  hasMore={hasMore}
                  loader={
                    <div style={{ textAlign: "center", padding: "20px" }}>
                      {t("placeholder.loading")}
                    </div>
                  }
                  endMessage={
                    tickets.length > 4 && (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        {t("placeholder.noMoreData")}
                      </div>
                    )
                  }
                  scrollableTarget="ticketsScrollableDiv"
                  style={{ overflow: "hidden" }}
                >
                  <div className={styles.ticketGrid}>
                    {getFilteredTickets().map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onClick={() => handleTicketClick(ticket)}
                      />
                    ))}
                  </div>
                </InfiniteScroll>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <LuckyWheel
        visible={showLuckyWheel}
        onClose={() => {
          fetchTickets(1);
          setShowLuckyWheel(false);
        }}
        id={info?.id}
        lottery_ticket_id={info?.lottery_id}
      />
      <PrizesModal
        open={isPrizesModalOpen}
        onClose={() => setIsPrizesModalOpen(false)}
      />
    </>
  );
};

export default memo(forwardRef(TicketsModal));
