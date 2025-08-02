import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WheelContent from '@/components/LuckyWheel/WheelContent';
import styles from './index.module.scss';

const LuckyWheel = () => {
  const { i18n } = useTranslation();
  const [isStandalone, setIsStandalone] = useState(false);
  const [params, setParams]:any = useState(null);

  useEffect(() => {
    // 检查是否是独立页面访问
    setIsStandalone(window.location.pathname.includes('/lucky-wheel'));
    
    // 从 URL 获取所有参数
    const fullUrl = window.location.href;
    // 处理带有hash的URL
    const hashIndex = fullUrl.indexOf('#');
    const questionMarkIndex = fullUrl.indexOf('?');
    
    let queryString = '';
    if (questionMarkIndex > -1) {
      queryString = fullUrl.substring(questionMarkIndex);
    }
    
    const urlParams = new URLSearchParams(queryString);

    const source = urlParams.get('source') || '';
    const orgId = urlParams.get('orgId') || '';
    const token = urlParams.get('token') || '';
    const id = urlParams.get('id') || '';
    const lottery_ticket_id = urlParams.get('lottery_ticket_id') || '';
    const lang = urlParams.get('lang');

 
    
    // 设置参数
    setParams({
      source,
      orgId,
      token,
      id,
      lottery_ticket_id
    });
    
    // 如果 URL 中有语言参数，则切换语言
    if (lang) {
      i18n.changeLanguage(lang);
    }
  }, []);

  const handleClose = () => {
    if (isStandalone) {
      window.close();
    }
  };

  return (
    <div className={styles.wheelPage}>
      <div className={styles.wheelContainer}>
      <WheelContent 
        id={params?.id}
        lottery_ticket_id={params?.lottery_ticket_id}
        params={params}
        onClose={handleClose}
        onComplete={(prize) => {
          // 这里可以添加其他完成后的处理逻辑
        }}
      />
      </div>
    </div>
  );
};

export default LuckyWheel; 