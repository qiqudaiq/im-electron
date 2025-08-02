

import { RoomMetadata } from "@/types/liveStream";
import {
  ReceivedChatMessage,
  useChat,
  useLocalParticipant,
  useRoomInfo,
  useRoomContext,
} from "@livekit/components-react";
import { PaperPlaneIcon, PersonIcon } from "@radix-ui/react-icons";
import {
  Box,
  Flex,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { t } from "i18next";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from 'antd';

const roleMap = {
  owner: t('placeholder.RoomOwner'),
  admin: t('placeholder.RoomManager'),
  publisher: t('placeholder.Participant'),
  user: t('placeholder.Viewers'),
}
function ChatMessage({ message }: { message: ReceivedChatMessage }) {
  const { localParticipant } = useLocalParticipant();
  const user = JSON.parse(message.from?.metadata || '{}');

  const roleTag = (role: string) => <span style={{
    backgroundColor: '#108ee9',
    color: 'rgb(240, 240, 240)',
    display: 'inline-block',
    lineHeight: '17px',
    width: 45,
    borderRadius: 17,
    textAlign: 'center',
    fontSize: 12,
    marginLeft: 8,
  }}>{roleMap[role as keyof typeof roleMap] || role}</span>;
 
  return (
    <Flex gap="2" align="start" className="p-2 rounded-lg hover:bg-gray-700/60 transition-all">
      {
        (user.faceURL && user.faceURL !== '') ?
          <Avatar size={35} src={user.faceURL} />
          : <Avatar
            size={35}
            style={{
              backgroundColor: '#3e6bce',
              color: 'rgb(240, 240, 240)',
            }}>
            {user.nickname[0]}
          </Avatar>
      }
      <Flex direction="column" className="break-words flex-1 min-w-0">
        <Text
          weight="bold"
          size="1"
          className={
            localParticipant.identity === message.from?.identity
              ? "text-blue-400"
              : "text-gray-200"
          }
        >
          {user.nickname ?? "Unknown"} {roleTag(user.role.name)}
        </Text>
        <Text size="1" className="text-gray-300">{message.message}</Text>
      </Flex>
    </Flex>
  );
}

export function Chat() {
  const [draft, setDraft] = useState("");
  const [msgList, setMsgList] = useState<any[]>([]);

  const { chatMessages, send } = useChat();
  const { metadata } = useRoomInfo();
  const { enable_chat: chatEnabled } = (
    metadata ? JSON.parse(metadata) : {}
  ) as RoomMetadata;
  const room = useRoomContext();
  room.on('dataReceived', (payload, participant, kind) => {
 
    const msg = JSON.parse(new TextDecoder().decode(payload));
    msg.from = participant;
    setMsgList((m) => [...m, msg]);

  });

  useEffect(() => {
    setMsgList((m) => [...m, ...chatMessages]);
  }, [chatMessages]);



  // HACK: why do we get duplicate messages?
  const messages = useMemo(() => {
    const timestamps = msgList.map((msg:any) => msg?.timestamp);
    const filtered = msgList.filter(
      (msg:any, i) => !timestamps.includes(msg?.timestamp, i + 1)
    );

    return filtered;
  }, [msgList.length]);

  const onSend = async () => {
    if (draft.trim().length && send) {
      setDraft("");
      await send(draft);
    }
  };

  return (
    <Flex direction="column" className="h-full" style={{ height: 'calc(100vh - 73px)', backgroundColor: '#252525' }}>
      <Flex
        direction="column"
        className="flex-1 h-full p-3 overflow-y-auto backdrop-blur-sm space-y-2"
        gap="2"
      >
        {messages.map((msg:any) => (
          <ChatMessage message={msg} key={msg?.timestamp} />
        ))}
      </Flex>
      <Box className="border-t backdrop-blur-sm p-3">
        <Flex gap="2">
          <Box className="flex-1">
            <TextField.Input
              disabled={!chatEnabled}
              placeholder={
                chatEnabled ? `${t('placeholder.SaySomething')} ...` : t('placeholder.ChatDisabled')
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
              className="bg-gray-800/70 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </Box>
          <IconButton
            onClick={onSend}
            disabled={!draft.trim().length}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white shadow-md"
          >
            <PaperPlaneIcon />
          </IconButton>
        </Flex>
      </Box>
    </Flex>
  );
}
