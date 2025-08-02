import { MessageStatus } from "@openim/wasm-client-sdk";
import { MessageItem, WsResponse } from "@openim/wasm-client-sdk/lib/types/entity";
import { SendMsgParams } from "@openim/wasm-client-sdk/lib/types/params";
import { useCallback, useMemo } from "react";
import { parseTwemoji } from "@/components/Twemoji";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore } from "@/store";
import { emit } from "@/utils/events";
import { t } from "i18next";
import { getConversationContent } from "@/utils/imCommon";
import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import { pushNewMessage, updateOneMessage } from "../useHistoryMessageList";
import errorCapture from "@/utils/errorCapture";

export type SendMessageParams = Partial<Omit<SendMsgParams, "message">> & {
  message: MessageItem;
  needPush?: boolean;
};

  function replaceIdsWithNames(cleanText: string, userList: any[]) {
    const idToNameMap = new Map();
    userList.forEach((user: any) => {
      idToNameMap.set(user.atUserID, user.groupNickname);
    });

    // 替换文本中的ID
    return cleanText.replace(/@([^\s@]+)/g, (match: string, atUserID: string) => {
      const name = idToNameMap.get(atUserID);
      return name !== undefined ? `@${name}` : match;
    });
  }

export function useSendMessage() {

    const latestMessageContent = (conversation, message) => {
      let content = "";
      if (!message) {
        return "";
      }
      
      try {
        content = getConversationContent(message, conversation, true);
      } catch (error) {
        content = t("messageDescription.catchMessage");
      }
      
      if (message.contentType === MessageType.AtTextMessage && message.atTextElem) {
        const { atUsersInfo } = message.atTextElem;
        if (atUsersInfo && atUsersInfo.length) {
          content = replaceIdsWithNames(content, atUsersInfo);
        }
      }
  
      return content;
    }

  const sendMessage = useCallback(
    async ({ recvID, groupID, message, needPush }: SendMessageParams) => {
      const currentConversation = useConversationStore.getState().currentConversation;
      const sourceID = recvID || groupID;
      const inCurrentConversation =
        currentConversation?.userID === sourceID ||
        currentConversation?.groupID === sourceID ||
        !sourceID;
      needPush = needPush ?? inCurrentConversation;

      if (needPush) {
        pushNewMessage(message);
        emit("CHAT_LIST_SCROLL_TO_BOTTOM");
      }
      
      const offlinePushInfo = {
        title: currentConversation?.showName,
        desc: latestMessageContent(currentConversation, { ...message, groupID: currentConversation?.groupID}),
        ex: JSON.stringify({
          sourceID,
          sessionType:  currentConversation?.conversationType,
          type: 'chat'
        }),
      }

      const options = {
        recvID: recvID ?? currentConversation?.userID ?? "",
        groupID: groupID ?? currentConversation?.groupID ?? "",
        message,
        offlinePushInfo,
      };

      try {
        const { data: successMessage } = await IMSDK.sendMessage(options);
        updateOneMessage(successMessage);
      } catch (error:any) {

        console.error('消息发送失败',message,error);
        
        // updateOneMessage({
        //   ...message,
        //   status: MessageStatus.Failed,
        // });
        errorCapture.capture(
          "send_message_failed",
          `消息发送失败: ${error?.message || error}`,
          error?.stack,
          JSON.stringify({
            recvID: options.recvID,
            groupID: options.groupID,
          })
        );
      }
    },
    [],
  );

  return {
    sendMessage,
  };
}
