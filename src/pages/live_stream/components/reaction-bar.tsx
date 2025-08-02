

import { useChat, useDataChannel } from "@livekit/components-react";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Button, Flex, Tooltip } from "@radix-ui/themes";
import { DataPacket_Kind } from "livekit-client";
import { useState } from "react";

export function ReactionBar() {
  const [encoder] = useState(() => new TextEncoder());
  const { send } = useDataChannel("reactions");
  const { send: sendChat } = useChat();

  const onSend = (emoji: string) => {
    send(encoder.encode(emoji), { kind: DataPacket_Kind.LOSSY });
    if (sendChat) {
      sendChat(emoji);
    }
  };

  return (
    <Flex
      gap="3"
      justify="center"
      align="center"
      className="border-t border-gray-700 bg-gray-800/60 backdrop-blur-sm h-[100px] text-center p-4"
    >
      <TooltipProvider>
        <Tooltip content="Fire" delayDuration={0}>
          <Button size="4" variant="outline" className="bg-gray-800/70 border-gray-600 hover:bg-gray-700 hover:border-blue-400" onClick={() => onSend("🔥")}>
            🔥
          </Button>
        </Tooltip>
        <Tooltip content="Applause">
          <Button size="4" variant="outline" className="bg-gray-800/70 border-gray-600 hover:bg-gray-700 hover:border-blue-400" onClick={() => onSend("👏")}>
            👏
          </Button>
        </Tooltip>
        <Tooltip content="LOL">
          <Button size="4" variant="outline" className="bg-gray-800/70 border-gray-600 hover:bg-gray-700 hover:border-blue-400" onClick={() => onSend("🤣")}>
            🤣
          </Button>
        </Tooltip>
        <Tooltip content="Love">
          <Button size="4" variant="outline" className="bg-gray-800/70 border-gray-600 hover:bg-gray-700 hover:border-blue-400" onClick={() => onSend("❤️")}>
            ❤️
          </Button>
        </Tooltip>
        <Tooltip content="Confetti">
          <Button size="4" variant="outline" className="bg-gray-800/70 border-gray-600 hover:bg-gray-700 hover:border-blue-400" onClick={() => onSend("🎉")}>
            🎉
          </Button>
        </Tooltip>
      </TooltipProvider>
    </Flex>
  );
}
