import React from "react";
import HostPageImpl from "./page.client";
import { Theme } from "@radix-ui/themes";
import { getParams } from '@/lib/queryParams';
import { UNSAFE_NavigationContext } from "react-router-dom";
import { useLiveStreamStore } from "@/store";
import '../styles/index.css';

interface QueryParams {
  at?: string;
  rt?: string;
  ws?: string;
}

interface PageProps {
  searchParams: {
    at: string | undefined;
    rt: string | undefined;
    ws: string | undefined;
  };
}

export default function HostPage() {
  const { navigator } = React.useContext(UNSAFE_NavigationContext);
  const { currentRoom, isHost } = useLiveStreamStore();

  const hash = window.location.hash;
  const hashParts = hash.split('?');
  const queryString = hashParts[1] || '';

  const params = getParams(queryString) as QueryParams;
  const { at, rt, ws } = params;
  
  if (!at || !rt || !ws) {
    navigator.push("/chat");
    return null;
  }

  // 在页面挂载时显示当前直播状态
  React.useEffect(() => {
  
  }, [currentRoom, isHost, at, rt, ws]);

  // 使用从接口获取的 ws_url，将 wss:// 转换为 https://
  const serverUrl = decodeURIComponent(ws)
    .replace("wss://", "https://")
    .replace("ws://", "http://");

  return (
    <Theme
      style={{ width: '100%' }}
      appearance="dark"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
    >
      <HostPageImpl authToken={at} roomToken={rt} serverUrl={serverUrl} />
    </Theme>
  );
}
