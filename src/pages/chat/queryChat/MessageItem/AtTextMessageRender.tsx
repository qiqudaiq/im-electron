import { FC } from "react";

import Twemoji from "@/components/Twemoji";
import { formatBr } from "@/utils/common";
import { formatLink } from "@/utils/imCommon";
import { emit } from "@/utils/events"; // 导入事件发射器
import { t } from "i18next";
import { IMessageItemProps } from ".";
import styles from "./message-item.module.scss";

const AtTextMessageRender: FC<IMessageItemProps> = ({ message }) => {
  let content = message.atTextElem?.text || "";
  const atUsersInfo = message.atTextElem?.atUsersInfo || [];
  const atUserList = message.atTextElem?.atUserList || [];

  // 检查是否@所有人
  const isAtAll = atUserList.some((id) => id === "AtAllTag");

  // 1. 先进行常规格式化
  content = formatLink(content);
  content = formatBr(content);

  // 2. 处理@标记，添加颜色和点击事件
  const processAtMentions = () => {
    // 使用临时DOM元素解析HTML内容
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // 如果有@所有人，处理@所有人的标记
    if (isAtAll) {
      const atAllText = `@AtAllTag`;
      
      // 在DOM中查找所有文本节点
      const textNodes = [];
      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }
      
      // 遍历文本节点，替换@所有人提及
      for (const textNode of textNodes) {
        if (textNode.nodeValue?.includes(atAllText)) {
          const parent = textNode.parentNode;
          const text = textNode.nodeValue || "";
          const parts = text.split(atAllText);

          if (parts.length > 1) {
            // 移除原始文本节点
            parent?.removeChild(textNode);

            // 重新添加内容，将@所有人部分替换为带样式的span
            for (let i = 0; i < parts.length; i++) {
              if (parts[i]) {
                parent?.appendChild(document.createTextNode(parts[i]));
              }

              // 在每个部分之间添加@所有人标记（除了最后一个部分之后）
              if (i < parts.length - 1) {
                const atSpan = document.createElement("span");
                atSpan.textContent = `@${t('placeholder.all')}`;
                atSpan.className = "at-all";
                atSpan.style.color = "#0081cc";

                parent?.appendChild(atSpan);
              }
            }
          }
        }
      }
    }

    // 如果没有@用户信息，直接返回处理后的内容
    if (!atUsersInfo || atUsersInfo.length === 0) {
      return tempDiv.innerHTML;
    }

    // 遍历所有@用户信息
    for (const user of atUsersInfo) {
      // 构建@文本，例如"@用户名"
    
      const atText = `@${user.groupNickname}`;
      const atTextId = `@${user.atUserID}`;
      // 在DOM中查找所有文本节点
      const textNodes = [];
      const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node);
      }

      // 遍历文本节点，替换@提及
      for (const textNode of textNodes) {
        if (textNode.nodeValue?.includes(atTextId)) {
          const parent = textNode.parentNode;
          const text = textNode.nodeValue || "";
          const parts = text.split(atTextId);

          if (parts.length > 1) {
            // 移除原始文本节点
            parent?.removeChild(textNode);

            // 重新添加内容，将@部分替换为带样式和事件的span
            for (let i = 0; i < parts.length; i++) {
              if (parts[i]) {
                parent?.appendChild(document.createTextNode(parts[i]));
              }

              // 在每个部分之间添加@标记（除了最后一个部分之后）
              if (i < parts.length - 1) {
                const atSpan = document.createElement("span");
                atSpan.textContent = atText;
                atSpan.className = "at-mention";
                atSpan.style.color = "#0081cc";
                atSpan.style.cursor = "pointer";
                // 添加data属性存储用户ID
                atSpan.dataset.userId = user.atUserID;
                atSpan.dataset.groupId = message.groupID || "";

                parent?.appendChild(atSpan);
              }
            }
          }
        }
      }
    }

    return tempDiv.innerHTML;
  };

  // 处理@内容
  const processedContent = processAtMentions();

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {

    // 检查点击的是否是@标记
    const target = e.target as HTMLElement;

    if (target.classList.contains("at-mention")) {
      const userId = target.dataset.userId;
      const groupId = target.dataset.groupId;

      if (userId && groupId) {
        // 触发打开用户详情事件
        window.userClick?.(userId, groupId);
        // 或者使用emit触发一个自定义事件
        // emit('OPEN_USER_PROFILE', { userId, groupId });

        e.stopPropagation(); // 阻止事件冒泡
      }
    }
  };

  return (
    <Twemoji dbSelectAll>
      <div
        className={styles.bubble}
        dangerouslySetInnerHTML={{ __html: processedContent }}
        onClick={handleClick}
      ></div>
    </Twemoji>
  );
};

export default AtTextMessageRender;
