

import { Chat } from "../components/chat";
import { ReactionBar } from "../components/reaction-bar";
import { Spinner } from "../components/Spinner";
import { StreamPlayer } from "../components/stream-player";
import { TokenContext } from "../components/token-context";
import { JoinStreamResponse, ParticipantMetadata } from "@/types/liveStream";
import { cn } from "@/lib/utils";
import { LiveKitRoom } from "@livekit/components-react";
import { ArrowRightIcon, PersonIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import { Room, RoomOptions, VideoPresets, LocalParticipant, ConnectionState } from "livekit-client";
import { useState, useMemo, useEffect, useCallback } from "react";
// import { useRouter } from "next/navigation";
import { useLocalParticipant as useLiveKitLocalParticipant } from "@livekit/components-react";
import { useUserStore, useLiveStreamStore } from "@/store";
import { t } from "i18next";
import RightSidebar from "../components/right-side-bar";


// Custom hook to safely parse metadata
const useParsedMetadata = (participant: LocalParticipant | undefined): ParticipantMetadata | null => {
  const [metadata, setMetadata] = useState<ParticipantMetadata | null>(null);

  useEffect(() => {
    if (!participant?.metadata) {
      setMetadata(null);
      return;
    }
    try {
      const parsed = JSON.parse(participant.metadata);
      setMetadata(parsed);
    } catch (e) {
      console.error("Failed to parse metadata:", participant.metadata, e);
      setMetadata(null);
    }
  }, [participant?.metadata]);

  return metadata;
};

export default function WatchPage({
  roomName,
}: {
  roomName: string;
}) {

  const selfInfo = useUserStore((state) => state.selfInfo);
  const [name, setName] = useState(`${selfInfo.nickname}(${selfInfo.userID})`);
  const [authToken, setAuthToken] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const { isLoading, error, joinStream } = useLiveStreamStore();
  // const router = useRouter();

 // 配置适合会议的视频选项（最大720p）
 const roomOptions = useMemo((): RoomOptions => {
  return {
    publishDefaults: {
      // 会议质量视频层次（最大720p）
      videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h540, VideoPresets.h360],
      videoEncoding: {
        maxBitrate: 3_000_000,  // 3Mbps适合会议的码率
        maxFramerate: 30        // 30fps适合会议的帧率
      },
      videoCodec: 'h264',       // 更广泛兼容的编码器
      dtx: true,                // 启用不连续传输降低带宽占用
      red: true                 // 启用冗余编码提高稳定性
    },
    adaptiveStream: { 
      pixelDensity: 'screen',   // 根据屏幕密度优化
      pauseVideoInBackground: true
    },
    dynacast: true,             // 动态广播
    videoCaptureDefaults: {
      resolution: VideoPresets.h720  // 720p会议采集
    },
    // 全局连接设置
    stopLocalTrackOnUnpublish: false // 停止发布时保持本地轨道
  };
}, []);

  const room = useMemo(() => new Room(roomOptions), [roomOptions]);

  

  // Use LiveKit hook to get local participant for reactivity

  const onJoin = async () => {
    try {
      const result = await joinStream(roomName);
      const { token, ws_url } = result.connection_details || result;
      
      setAuthToken(token);
      setRoomToken(token);
      
      // 将 ws_url 转换为 LiveKit 所需的 HTTP 格式
      const formattedServerUrl = ws_url
        .replace("wss://", "https://")
        .replace("ws://", "http://");
      setServerUrl(formattedServerUrl);
    } catch (error: any) {
      console.error("Join failed:", error);
      // 错误处理已在 Hook 中统一处理
    }
  };

  // --- Disconnection Handling ---
  const handleDisconnect = useCallback(() => {
    // Directly navigate to home page without alert
    window.location.href = '/';
  }, []); // Remove router dependency since we're using window.location

  if (!authToken || !roomToken || !serverUrl) {
    return (
      <Flex align="center" justify="center" className="min-h-screen" >
        <Card className="p-3 w-[380px]">
          <Heading size="4" className="mb-4">
            {t('placeholder.Join')} {decodeURI(roomName)}
          </Heading>
          {error && (
            <Text color="red" size="2" mb="4">
              Error: {error}
            </Text>
          )}
          <Flex gap="3" mt="6" justify="end">
            <Button disabled={!name || isLoading} onClick={onJoin}>
              {isLoading ? (
                <Flex gap="2" align="center">
                  <Spinner />
                  <Text>{t('placeholder.Joining')}...</Text>
                </Flex>
              ) : (
                <>
                  {t('placeholder.JoinAsViewer')}{" "}
                  <ArrowRightIcon className={cn(name && "animate-wiggle")} />
                </>
              )}
            </Button>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom 
        room={room}
        serverUrl={serverUrl} 
        token={roomToken} 
        connect={true}
        audio={false} 
        video={false}
        onDisconnected={handleDisconnect}
      >
        <Flex  className="w-full h-screen">
          <Flex direction="column" className="flex-1">
            <Box className="flex-1 bg-gray-1">
              <StreamPlayer isHost={false} />
            </Box>
          </Flex>
          <Box className="min-w-[360px]" style={{ borderLeft: "1px solid rgb(240, 240, 240)", backgroundColor: '#252525' }}>
            {/* <Chat /> */}
            <RightSidebar />
          </Box>
        </Flex>
      </LiveKitRoom>
    </TokenContext.Provider>
  );
}
