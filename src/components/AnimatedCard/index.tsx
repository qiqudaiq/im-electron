import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import classNames from 'classnames';
import styles from './index.module.scss';

interface AnimatedCardProps {
  visible: boolean;
  onClose: () => void;
  frontContent?: React.ReactNode;
  children: React.ReactNode;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  visible,
  onClose,
  frontContent,
  children
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // 等待Modal打开动画完成后显示内容
      const showTimer = setTimeout(() => setShowContent(true), 100);
      
      return () => {
        clearTimeout(showTimer);
      };
    } else {
      setModalVisible(false);
      setShowContent(false);
    }
  }, [visible]);

  const handleClose = () => {
    setShowContent(false);
    setTimeout(() => {
      setModalVisible(false);
      onClose();
    }, 800);
  };

  return (
    <Modal
      open={modalVisible}
      footer={null}
      closable={false}
      maskClosable={true}
      onCancel={handleClose}
      // centered
      width={320}
      zIndex={10000}
      className={styles.animatedModal}
    >
      <div className={styles.cardContainer}>
        <div
          className={classNames(styles.card, {
            [styles.show]: showContent
          })}
        >
          <div className={styles.cardFront}>
            {frontContent || (
              <div className={styles.defaultFront}>
                <img src="/logo.svg" alt="logo" width={120} height={120} />
                <h2 className="text-center">每日签到</h2>
              </div>
            )}
          </div>
          <div className={styles.cardBack}>
            {children}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AnimatedCard; 