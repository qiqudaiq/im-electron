import React from "react";
import WatchPageImpl from "./page.client";
import { getParams } from '@/lib/queryParams';
import { Theme } from "@radix-ui/themes";
import { UNSAFE_NavigationContext } from "react-router-dom";
import { useLiveStreamStore } from "@/store";
import '../styles/index.css';




const WatchPage = () => {
  const { navigator } = React.useContext(UNSAFE_NavigationContext);
  const { currentRoom, isHost } = useLiveStreamStore();

  const hash = window.location.hash;
  const hashParts = hash.split('?');
  const queryString = hashParts[1] || '';

  const params:any = getParams(queryString);
  const { roomName } = params;

  if (!roomName) {
    navigator.push("/chat");
  }

  // 在页面挂载时显示当前直播状态
  React.useEffect(() => {
   
  }, [currentRoom, isHost, roomName]);


  return (
    <Theme
      style={{ width: "100%" }}
      appearance="dark"
      accentColor="blue"
      grayColor="slate"
      radius="medium"
    >
      <WatchPageImpl roomName={roomName}  />
    </Theme>
  );
}

export default WatchPage;
