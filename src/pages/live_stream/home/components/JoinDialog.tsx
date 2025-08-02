

import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
// import { useRouter } from "next/navigation";
import { UNSAFE_NavigationContext } from "react-router-dom";

import React, { useState } from "react";
import { Spinner } from "../../components/Spinner";
import { useUserStore } from "@/store";
import { t } from "i18next";

export function JoinDialog({ children }: { children: React.ReactNode }) {
  // const router = useRouter();
    const { navigator } = React.useContext(UNSAFE_NavigationContext);
  

  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const selfInfo = useUserStore((state) => state.selfInfo);
  const updateSelfInfo = useUserStore((state) => state.updateSelfInfo);
  

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>{t('placeholder.JoinLiveStreaming')}</Dialog.Title>
        <Flex direction="column" gap="3" mt="4">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              {t('placeholder.RoomName')}
            </Text>
            <TextField.Input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </label>
        </Flex>

        <Flex gap="3" mt="6" justify="end">
          <Dialog.Close>
            <Button
              variant="soft"
              color="gray"
              onClick={() => {
                setRoomName("");
              }}
            >
              {t('cancel')}
            </Button>
          </Dialog.Close>

          <Button
            disabled={!roomName || loading}
            onClick={() => {
              setLoading(true);
              navigator.push(`/live/watch?roomName=${roomName}`);
            }}
          >
            {loading ? (
              <Flex gap="2" align="center">
                <Spinner />
                <Text>{t('placeholder.Joining')}...</Text>
              </Flex>
            ) : (
              <>{t('placeholder.Join')}</>
            )}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
