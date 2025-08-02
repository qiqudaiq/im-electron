import React from "react";
import { HomeActions } from "./HomeActions";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import back from "@/assets/images/live/back.png";
import { t } from "i18next";
import { UNSAFE_NavigationContext } from "react-router-dom";

export default function Home() {
  const { navigator } = React.useContext(UNSAFE_NavigationContext);

  return (
    <main className="relative flex min-h-screen flex-col items-center  overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
      {/* <img 
          src={back}
          onClick={() => navigator.push('/chat')}
          style={{
            width: 32,
            position: 'absolute',
            top: 25,
            left: 25,
            cursor: 'pointer',
            zIndex:10
          }}
        /> */}
      {/* 背景动画效果 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* 主要内容 */}
      <div  className="relative z-10">
        <Flex direction="column" align="center" justify="center" gap="6" className="">
          <div className="relative my-8 pt-8">
            <Heading
              size="9"
              className="drop-shadow-glow animate-fade-in text-center text-[4rem] font-black text-white sm:text-[5rem]"
            >
              FREECHAT
            </Heading>
            <div className="absolute -inset-x-6 -inset-y-4 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl" />
          </div>

          {/* 副标题 */}
          <Text
            size="5"
            className="animate-slide-up max-w-md  text-center text-zinc-200 opacity-0 [animation-delay:200ms]"
          >
            {/* 实时互动直播平台 */}
            {t("placeholder.RealTimeInteractiveLiveStreamingPlatform")}
          </Text>

          {/* 按钮组 */}
          <div className="animate-slide-up opacity-0 [animation-delay:400ms]">
            <HomeActions />
          </div>
        </Flex>
        <div className="mt-10  pr-2">
          <LiveStreamList />
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent" />
    </main>
  );
}

// 添加必要的动画样式
import "../../styles/animations.css";
import LiveStreamList from "./LiveStreamList";
