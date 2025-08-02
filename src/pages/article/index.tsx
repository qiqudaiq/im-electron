import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Typography, Card, Divider, message, Button } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { getArticleDetail } from '@/api/login';
import { feedbackToast } from '@/utils/common';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import { t } from 'i18next';

const { Title } = Typography;

interface ArticleData {
    title: string;
    content: string;
    updated_at: string;
    id: string;
    created_at?: string;
}

export const Article = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [articleData, setArticleData] = useState<ArticleData | null>(null);

    const articleId = searchParams.get('id');

    useEffect(() => {
        if (!articleId) {
            message.error(t('article.idCannotBeEmpty'));
            return;
        }

        fetchArticleDetail();
    }, [articleId]);

    const fetchArticleDetail = async () => {
        if (!articleId) return;

        setLoading(true);
        try {
            const response = await getArticleDetail(articleId);
            if (response.data) {
                setArticleData(response.data);
            } else {
                message.error(t('article.getDetailFailed'));
            }
        } catch (error) {
            console.error(t('article.getDetailFailed'), error);
            feedbackToast({
                error,
                msg: t('article.getDetailFailed')
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        // 检查是否在 Electron 环境中
        if (window.electronAPI) {
            // Electron 环境：关闭当前窗口
            window.electronAPI.ipcInvoke('closeWindow');
        } else {
            if (window.history.length > 1) {
                navigate(-1);
            } else {
                navigate('/');
            }
        }
    };

    const formatDate = (dateString: string) => {
        return dayjs(dateString).format('YYYY/MM/DD HH:mm');
    };

    if (loading) {
        return (
            <div className={styles['loading-state']}>
                <Spin size="large" />
            </div>
        );
    }

    if (!articleData) {
        return (
            <div className={styles['error-state']}>
                <Card className={styles['error-card']}>
                    <Title level={4} className={styles['error-title']}>{t('article.notFound')}</Title>
                    <Button type="primary" onClick={handleBack} className="mt-4">
                        {t("placeholder.getBack")}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles['article-container']}>
            {/* 顶部导航栏 */}
            <div className={styles['article-header']}>
                <div className={styles['header-content']}>
                    {/* <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={handleBack}
                        className={styles['back-button']}
                    >
                        {t("placeholder.getBack")}
                    </Button> */}
                    <span className={styles['title']}>{t('article.title')}</span>
                </div>
            </div>

            {/* 文章内容 */}
            <div className={styles['article-content']}>
                <div className={styles['article-card']}>
                    {/* 文章标题 */}
                    <h1 className={styles['article-title']}>
                        {articleData.title}
                    </h1>

                    {/* 文章元信息 */}
                    <div className={styles['article-meta']}>
                        <div className={styles['meta-item']}>
                            <CalendarOutlined />
                            <span>{t('article.updateTime')}: {formatDate(articleData.updated_at)}</span>
                        </div>
                    </div>

                    <Divider />

                    {/* 文章正文 */}
                    <div
                        className={styles['article-body']}
                        dangerouslySetInnerHTML={{ __html: articleData.content }}
                    />
                </div>
            </div>
        </div>
    );
};