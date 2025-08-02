

import { Chat } from "../components/chat";
import { ReactionBar } from "../components/reaction-bar";
import { StreamPlayer } from "../components/stream-player";
import { TokenContext } from "../components/token-context";
import { LiveKitRoom } from "@livekit/components-react";
import { Box, Flex } from "@radix-ui/themes";
import { Room, RoomOptions, VideoPresets } from "livekit-client";
import { useMemo } from "react";
import RightSidebar from "../components/right-side-bar";

export default function HostPage({
  authToken,
  roomToken,
  serverUrl,
}: {
  authToken: string;
  roomToken: string;
  serverUrl: string;
}) {
  // 配置适合会议的视频选项（最大720p）
  const roomOptions = useMemo((): RoomOptions => {
    return {
      publishDefaults: {
        // 会议质量视频层次（最大720p）
        videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h540, VideoPresets.h360],
        videoEncoding: {
          maxBitrate: 3_000_000, // 3Mbps适合会议的码率
          maxFramerate: 30       // 30fps适合会议的帧率
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

  return (
    <TokenContext.Provider value={authToken}>
      <LiveKitRoom 
        room={room}
        serverUrl={serverUrl} 
        token={roomToken} 
        video={false} 
        audio={false}
      >
        <Flex className="w-full h-screen">
          <Flex direction="column" className="flex-1">
            <Box className="flex-1 bg-gray-1">
              <StreamPlayer isHost />
            </Box>
            {/* <ReactionBar /> */}
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
