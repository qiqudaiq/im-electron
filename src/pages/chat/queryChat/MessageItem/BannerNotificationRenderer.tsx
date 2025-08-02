import type { MessageItem } from "@openim/wasm-client-sdk";
import { FC } from "react";
import { Image, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { getResourceUrl } from "@/utils/common";

interface RefundNotificationProps {
    message: MessageItem;
}

const BannerNotificationRenderer: FC<RefundNotificationProps> = ({ message }) => {
    const res = JSON.parse(message.notificationElem!.detail).bannerElem;

    let { description, external_url, image_url, title, article_id } = res;

    // 检测是否为Electron环境
    const isElectron = Boolean(window.electronAPI);

    const handleClick = () => {
        const articleUrl = article_id ? `/article?id=${article_id}` : "/article";
        
        if (isElectron) {
            // Electron环境 - 打开新窗口
            window.electronAPI?.openNewWindow({ 
                url: articleUrl, 
                width: 1600, 
                height: 1000 
            });
        } else {
            // 浏览器环境 - 打开新标签页
            const baseUrl = window.location.origin;
            const fullUrl = `${baseUrl}#${articleUrl}`;
            window.open(fullUrl, '_blank');
        }
    };

    return (
        <div className="w-[300px] cursor-pointer shadow-sm" onClick={handleClick}>
            <div className="overflow-hidden rounded-t">
                <Image
                    className="rounded-md size-full object-cover aspect-[2/1] overflow-hidden"
                    src={getResourceUrl(image_url)}
                    preview={false}
                    placeholder={
                        <div className="flex items-center justify-center">
                            <Spin />
                        </div>
                    }
                />
            </div>
            <div className="p-2 bg-gray-100 rounded-b overflow-hidden">
                <div className="line-clamp-1">{title}</div>
                <div className="line-clamp-2 text-gray-600 mt-2">{description}</div>
            </div>
        </div>
    )
}

export default BannerNotificationRenderer;