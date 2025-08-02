import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { CloseCircleOutlined } from "@ant-design/icons";
import { MessageType, SessionType } from "@openim/wasm-client-sdk";
import { CbEvents } from "@openim/wasm-client-sdk";
import { GroupMemberItem } from "@openim/wasm-client-sdk/lib/types/entity";
import { useLatest } from "ahooks";
import { Dropdown } from "antd";
import { t } from "i18next";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuidV4 } from "uuid";

import AtMemberList from "@/components/AtMemberList";
import CKEditor, { CKEditorRef, EmojiData } from "@/components/CKEditor";
import {
  base64ToImageFile,
  getCleanText,
  getImgTags,
} from "@/components/CKEditor/utils";
import { useCurrentMemberRole } from "@/hooks/useCurrentMemberRole";
import useGroupMembers from "@/hooks/useGroupMembers";
import i18n from "@/i18n";
import { IMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useUserStore } from "@/store";
import { useForwardStore } from "@/store";
import { formatMessageByType, uploadFile } from "@/utils/imCommon";
import { getSendAction, setSendAction as saveSendAction } from "@/utils/storage";

import SendActionBar from "./SendActionBar";
import { useFileMessage } from "./SendActionBar/useFileMessage";
import { useSendMessage } from "./useSendMessage";


const sendActions = [
  { label: t("placeholder.sendWithEnter"), key: "enter" },
  { label: t("placeholder.sendWithShiftEnter"), key: "enterwithshift" },
];

i18n.on("languageChanged", () => {
  sendActions[0].label = t("placeholder.sendWithEnter");
  sendActions[1].label = t("placeholder.sendWithShiftEnter");
});

const ChatFooter: ForwardRefRenderFunction<unknown, unknown> = (_, ref) => {
  const { selectionMode, cancelSelectionMode, selectedMessages, batchForwardMessages } =
    useForwardStore();
  const [html, setHtml] = useState("");
  const latestHtml = useLatest(html);
  const [sendAction, setSendAction] = useState(getSendAction());
  const [atMemberIds, setAtMemberIds] = useState<string[]>([]);

  const { fetchState, getMemberData } = useGroupMembers();

  const editorWrapRef = useRef<HTMLDivElement>(null);
  const ckRef = useRef<CKEditorRef>(null);

  const { createFileMessage } = useFileMessage();
  const { sendMessage } = useSendMessage();
  const quoteMessage = useConversationStore((state) => state.quoteMessage);
  const setQuoteMessage = useConversationStore((state) => state.setQuoteMessage);
  const currentConversation = useConversationStore(
    (state) => state.currentConversation,
  );
  const currentGroupInfo = useConversationStore((state) => state.currentGroupInfo);
  const { isOwner, isAdmin, isNomal, currentIsMuted } = useCurrentMemberRole();

  const isGroup = currentConversation?.conversationType === SessionType.Group;
  const isGroupMuted = currentGroupInfo?.status === 3;
  // 只有群主和管理员可以在全员禁言状态下发言
  const canSendMessageInGroup = !isGroupMuted || isOwner || isAdmin;
  // 个人是否被禁言
  const isMemberMuted = isGroup && currentIsMuted;
  // 总体是否可以发送消息（既不是全员禁言，也不是个人被禁言）
  const canSendMessage = !isGroup || (canSendMessageInGroup && !isMemberMuted);

  // 使用useRef存储@用户列表和信息
  const atUserIDListRef = useRef<string[]>([]);
  const atUsersInfoRef = useRef<Array<{ atUserID: string; groupNickname: string }>>([]);

  const membersListRef = useRef<any[]>([]);
  const quoteMessageRef = useRef(quoteMessage);
  const peerNickname = currentConversation?.showName;
  const selfNickname = useUserStore.getState().selfInfo?.nickname;

  useEffect(() => {
    quoteMessageRef.current = quoteMessage;
  }, [quoteMessage]);

  useEffect(() => {
    cancelSelectionMode();
  }, [currentConversation]);

  useEffect(() => {
    if (currentGroupInfo?.groupID && isGroup) {
      getMemberData(true);
    }
  }, [currentGroupInfo?.groupID, isGroup]);

  useEffect(() => {
    if (isGroup && fetchState.groupMemberList.length > 0) {
      membersListRef.current = fetchState.groupMemberList.map((member) => ({
        atUserID: member.userID,
        groupNickname: member.nickname,
      }));
    }
  }, [isGroup, fetchState.groupMemberList]);

  useEffect(() => {
    // 监听群组信息变化，包括禁言状态
    if (isGroup) {
      const onGroupInfoChanged = ({ data }: { data: any }) => {
        if (data.groupID === currentGroupInfo?.groupID) {
          // 群组信息变化时会自动更新状态，这里无需额外处理
        }
      };

      IMSDK.on(CbEvents.OnGroupInfoChanged, onGroupInfoChanged);

      return () => {
        IMSDK.off(CbEvents.OnGroupInfoChanged, onGroupInfoChanged);
      };
    }
  }, [isGroup, currentGroupInfo?.groupID]);

  const onChange = (value: string) => {
    setHtml(value);
  };

  function replaceMentionsWithIds(cleanText, userList) {
    // 创建一个映射，记录每个名字出现的次数
    const nameCountMap = new Map();
    userList.forEach((user) => {
      nameCountMap.set(
        user.groupNickname,
        (nameCountMap.get(user.groupNickname) || 0) + 1,
      );
    });

    // 为每个名字创建一个计数器
    const nameCounter = new Map();
    nameCountMap.forEach((count, groupNickname) => {
      nameCounter.set(groupNickname, 0);
    });

    // 替换文本中的提及
    return cleanText.replace(/@([^\s@]+)/g, (match, groupNickname) => {
      // 检查这个名字是否在userList中存在
      const count = nameCountMap.get(groupNickname);
      if (count === undefined) {
        return match; // 如果不存在，保留原样
      }

      // 获取当前名字的计数器值
      const currentCount = nameCounter.get(groupNickname);
      nameCounter.set(groupNickname, currentCount + 1);

      // 找到对应顺序的用户
      let userIndex = 0;
      let occurrence = 0;
      for (let i = 0; i < userList.length; i++) {
        if (userList[i].groupNickname === groupNickname) {
          if (occurrence === currentCount) {
            userIndex = i;
            break;
          }
          occurrence++;
        }
      }

      // 返回对应的用户ID
      return `@${userList[userIndex].atUserID}`;
    });
  }
  const enterToSend = async () => {
    const cleanText = getCleanText(latestHtml.current);
    const tags = getImgTags(latestHtml.current);

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (tag.src && tag.src.startsWith("data:image")) {
        const imgFile:any = base64ToImageFile(tag.src, `${uuidV4()}.png`);
        const message = await createFileMessage(imgFile);
        sendMessage({
          message,
        });
      }
    }
    let message;

    if (!cleanText) {
      setHtml("");
      return;
    }


    try {
      // 如果是群聊并且有@成员
      if (isGroup && atUserIDListRef.current.length > 0) {
        const operationID = String(Date.now());
        // 创建@消息，包含引用消息(如果有)
        message = await IMSDK.createTextAtMessage(
          {
            text: replaceMentionsWithIds(cleanText, atUsersInfoRef.current),
            atUserIDList: atUserIDListRef.current,
            atUsersInfo: atUsersInfoRef.current,
            message: quoteMessageRef.current, // 如果有引用消息，传入
          },
          operationID,
        );

        // 如果有引用消息，清除引用状态
        if (quoteMessageRef.current) {
          setQuoteMessage(undefined);
        }
      } else if (quoteMessageRef.current) {
        // 如果只有引用消息，没有@成员
        const operationID = String(Date.now());
        message = await IMSDK.createQuoteMessage(
          {
            text: cleanText,
            message: JSON.stringify(quoteMessageRef.current),
          },
          operationID,
        );
        setQuoteMessage(undefined);
      } else {
        // 普通文本消息
        message = await IMSDK.createTextMessage(cleanText);
      }

      setHtml("");
      // 清空@列表
      atUserIDListRef.current = [];
      atUsersInfoRef.current = [];

      sendMessage({ message: message.data });
    } catch (error) {
      console.error("创建消息失败:", error);
    }
  };

  const sendEmoji = (item: EmojiData) => ckRef.current?.insertEmoji(item);
  const updateSendAction = (action: string) => {
    setSendAction(action as "enter" | "enterwithshift");
    saveSendAction(action);
  };

  const clearQuoteMessage = () => {
    setQuoteMessage(undefined);
  };

  // 处理@成员的回调
  const handleMention = (
    action: "add" | "remove",
    userId: string,
    memberName: string,
  ) => {
    if (action === "add") {
      // 如果是@所有人
      if (userId === "AtAllTag") {
        if (!atUserIDListRef.current.includes("AtAllTag")) {
          atUserIDListRef.current.push("AtAllTag");
          atUsersInfoRef.current.push({
            atUserID: "AtAllTag",
            groupNickname: t("placeholder.all"),
          });
        }
        return;
      }

      // 普通@成员，添加到@列表中，避免重复添加同一个成员
      if (!atUserIDListRef.current.includes(userId)) {
        // 更新用户ID列表
        atUserIDListRef.current.push(userId);

        // 查找这个用户在群成员列表中的信息
        const memberInfo = membersListRef.current.find((m) => m.atUserID === userId);

        // 如果找到了成员信息，更新atUsersInfo
        if (memberInfo) {
          atUsersInfoRef.current.push({
            atUserID: userId,
            groupNickname: memberInfo.groupNickname || memberName,
          });
        } else {
          // 如果没找到成员信息，使用memberName作为群昵称
          atUsersInfoRef.current.push({
            atUserID: userId,
            groupNickname: memberName,
          });
        }

      }
    } else if (action === "remove") {
      // 从列表中移除被删除的@用户
      atUserIDListRef.current = atUserIDListRef.current.filter((id) => id !== userId);
      atUsersInfoRef.current = atUsersInfoRef.current.filter(
        (info) => info.atUserID !== userId,
      );

    }
  };

  const handleDeleteMessages = () => {
    try {
      selectedMessages.forEach(async (item) => {
        await IMSDK.deleteMessage({
          conversationID: currentConversation?.conversationID || "",
          clientMsgID: item.clientMsgID,
        });
      });
    } catch (error) {
      console.error("删除消息失败:", error);
    }
  };

  return (
    <footer className="relative h-full bg-white py-px">
      <div className="flex h-full flex-col border-t border-t-[var(--gap-text)]">
        {!selectionMode && canSendMessage && (
          <SendActionBar
            sendEmoji={sendEmoji}
            sendMessage={sendMessage}
            createFileMessage={createFileMessage}
            disabled={!canSendMessage}
          />
        )}
        <div
          ref={editorWrapRef}
          className="relative flex flex-1 flex-col overflow-hidden"
        >
          {!selectionMode && quoteMessage && (
            <div
              className="-webkit-box -webkit-line-clamp mx-2 mt-2 inline-block rounded px-2 py-1 "
              style={{ backgroundColor: "#f5f5f5", height: "30px", overflow: "hidden" }}
            >
              <div style={{ display: "flex" }}>
                <div className="ml-1 mr-2 cursor-pointer" onClick={clearQuoteMessage}>
                  <CloseCircleOutlined style={{ color: "#999" }} />
                </div>
                <div style={{ color: "#999" }}>
                  {t("placeholder.quoteReply", { name: quoteMessage.senderNickname })}：{" "}
                  {quoteMessage.contentType === MessageType.TextMessage
                    ? quoteMessage.textElem?.content
                    : formatMessageByType(quoteMessage)}
                </div>
              </div>
            </div>
          )}
          {selectionMode ? (
            <div
              className="flex h-full items-center "
              style={{ backgroundColor: "#f5f5f5", paddingLeft: 20 }}
            >
              <div className="flex items-center gap-10">
                <div>
                  <button
                    onClick={() => batchForwardMessages(isGroup)}
                    className=" rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-600 "
                  >
                    <ExportOutlined style={{ fontSize: "16px" }} />
                    <div className="text-gray-600">{t('placeholder.mergeForward')}</div>
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => handleDeleteMessages()}
                    className=" rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-600 "
                    disabled={selectedMessages.length === 0}
                  >
                    <DeleteOutlined style={{ fontSize: "16px" }} />
                    <div className="text-gray-600">{t('placeholder.delete')}</div>
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => cancelSelectionMode()}
                    className=" rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-600 "
                  >
                    <CloseOutlined style={{ fontSize: "16px" }} />
                    <div className="text-gray-600">{t('placeholder.close')}</div>
                  </button>
                </div>
              </div>
            </div>
          ) : // 非多选模式逻辑
          !canSendMessage ? (
            <div className="flex h-full items-center justify-center bg-gray-100 py-4 text-gray-500">
              <InfoCircleOutlined className="mr-2" />
              <span>
                {isMemberMuted
                  ? t("toast.currentMuted")
                  : t("placeholder.groupIsMuted")}
              </span>
            </div>
          ) : (
            <>
              <CKEditor
                ref={ckRef}
                value={html}
                enterWithShift={sendAction === "enterwithshift"}
                onEnter={() => {
                  enterToSend();
                }}
                setHtml={setHtml}
                html={html}
                onChange={onChange}
                isGroupChat={isGroup}
                onMention={handleMention}
                onContextMenu={
                  !window.electronAPI
                    ? undefined
                    : () => window.electronAPI?.ipcInvoke("showInputContextMenu")
                }
              />
              <div className="flex items-center justify-end py-2 pr-3">
                <Dropdown.Button
                  overlayClassName="send-action-dropdown"
                  className="w-fit px-6 py-1"
                  type="primary"
                  icon={<DownOutlined />}
                  menu={{
                    items: sendActions.map((item) => ({
                      label: item.label,
                      key: item.key,
                      itemIcon: sendAction === item.key ? <CheckOutlined /> : undefined,
                      onClick: () => updateSendAction(item.key),
                    })),
                  }}
                  onClick={enterToSend}
                >
                  {t("placeholder.send")}
                </Dropdown.Button>
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};

export default memo(forwardRef(ChatFooter));
