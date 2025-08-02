import { FC, useState } from "react";
import { useUserStore } from "@/store";
import { t } from "i18next";
import "./style.css";

interface RedPacketCoverProps {
  senderName: string;
  type: string;
  receiverName?: string;
  receiverId?: string;
  mark?: string;
  onOpen: (password: string) => void;
  isOpened: boolean;
}

const RedPacketCover: FC<RedPacketCoverProps> = ({
  senderName,
  type,
  receiverName,
  receiverId,
  mark = t('placeholder.WishYouWealth'),
  onOpen,
  isOpened,
}) => {
  const selfInfo = useUserStore((state) => state.selfInfo);
  const currentUserID = selfInfo.userID;

  const [password, setPassword] = useState('');
  const getRedPacketTitle = () => {

    if (receiverName) {
      return t('placeholder.RedPacketFromTo', {
        senderName: senderName,
        receiverName: receiverName
      })
    }
    return t('placeholder.RedPacketFromSender', { senderName: senderName })
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };
  const btnDisabled = !password.length && type === 'PASSWORD';

  return (
    <div className={`redPacket-cover ${isOpened ? "slide-up" : ""}`}>
      <div className="redPacket-cover-content">
        <div className="redPacket-avatar">
          <div className="redPacket-icon"></div>
        </div>
        <div className="redPacket-sender">{getRedPacketTitle()}</div>
        <div className="redPacket-greeting">{mark}</div>
        {
          type === 'PASSWORD' && <input className="redPacket-password-input" placeholder="请输入口令" onChange={handlePasswordChange} />
        }
        {
          (!receiverId || receiverId === currentUserID) && <button style={{ opacity: btnDisabled ? 0.5 : 1 }} disabled={btnDisabled} className="redPacket-open-btn" onClick={() => onOpen(password)}>
            開
          </button>
        }

      </div>
    </div>
  );
};

export default RedPacketCover;
