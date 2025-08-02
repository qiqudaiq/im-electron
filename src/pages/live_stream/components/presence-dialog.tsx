

import { ParticipantMetadata, RoomMetadata } from "@/types/liveStream";
import {
  useLocalParticipant,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { Cross1Icon, PersonIcon, StopIcon } from "@radix-ui/react-icons";
import {
  Avatar,
  Button,
  Dialog,
  Flex,
  IconButton,
  Text,
} from "@radix-ui/themes";
import { Participant } from "livekit-client";
import { useMemo } from "react";
import { t } from "i18next";
import { useLiveStreamStore } from '@/store';


// 从环境变量中导入域名，如果不存在则使用默认值

function ParticipantListItem({
  participant,
  isCurrentUser,
  isHost = false,
  allowParticipation
}: {
  participant: Participant;
  isCurrentUser: boolean;
  isHost?: boolean;
  allowParticipation?: boolean;
}) {
  const { inviteToStage, approveHandRaise, removeFromStage, blockViewer } = useLiveStreamStore();
  
  const pMetadata = useMemo(() => {
    try {
      return participant.metadata ? JSON.parse(participant.metadata) as ParticipantMetadata : null;
    } catch (e) {
      console.error("Failed to parse participant metadata:", participant.metadata, e);
      return null;
    }
  }, [participant.metadata]);

  const room = useRoomContext();
  const roomMetadata = (room.metadata &&
    JSON.parse(room.metadata)) as RoomMetadata;

  const onInvite = async () => {
    try {
        await inviteToStage(participant.identity);
    } catch (error) {
        console.error(`[PresenceDialog] Failed to invite ${participant.identity}:`, error);
    }
  };

  const onApproveHandRaise = async () => {
    try {
        await approveHandRaise(participant.identity);
    } catch (error) {
        console.error(`[PresenceDialog] Failed to approve hand raise for ${participant.identity}:`, error);
    }
  };

  const onCancelOrRemove = async () => {
    try {
        await removeFromStage(room.name, participant.identity);
      } catch (error) {
          console.error(`[PresenceDialog] Failed to remove/cancel for ${participant.identity}:`, error);
      }
  };

  const onBlock = async () => {
    if (window.confirm(t('placeholder.ConfirmBlockParticipant'))) {
        try {
            await blockViewer(participant.identity);
        } catch (error) {
            console.error(`[PresenceDialog] Failed to block ${participant.identity}:`, error);
        }
    }
  };

  const isParticipantHost = participant.identity === roomMetadata?.creator_identity;
  const renderActions = () => {
      if (isHost) { // Only host sees action buttons for others
          if (isCurrentUser) { // Host doesn't see actions for themselves
              return null;
          }
          else { // Actions for other participants seen by host
                if (!allowParticipation) return <Text size="1" color="gray">Participation disabled</Text>; 

                const canBlock = true; // Always allow blocking for now
                let mainActions = null;

                // Determine participant state
                const isInvited = pMetadata?.invited_to_stage === true;
                const isHandRaised = pMetadata?.hand_raised === true;
                const isOnStage = participant.permissions?.canPublish === true;


                if (isOnStage) {
                    // Participant is already on stage -> Show "Remove" button
                    mainActions = <Button size="1" variant="outline" color="red" onClick={onCancelOrRemove}>{t('placeholder.Remove')}</Button>;
                } else if (isHandRaised) {
                    // Participant has raised hand (and is not on stage)
                    // Host needs to Accept (approve) or Reject the request.
                    mainActions = (
                        <Flex gap="2">
                            {/* --- CORRECTED onClick HANDLER --- */}
                            <Button size="1" onClick={onApproveHandRaise}>{t('placeholder.Accept')}</Button> 
                            <Button size="1" variant="outline" onClick={onCancelOrRemove}>{t('placeholder.Reject')}</Button>
                        </Flex>
                    );
                } else if (isInvited) {
                    // Participant has been invited but hasn't accepted/raised hand yet (and is not on stage)
                    // Host can cancel the invite.
                     mainActions = <Button size="1" variant="outline" onClick={onCancelOrRemove}>{t('placeholder.CancelInvite')}</Button>;
                } else {
                    // Participant is idle (not on stage, not invited, not raised hand)
                    // Host can invite them.
                     mainActions = <Button size="1" onClick={onInvite}>{t('placeholder.InviteToStage')}</Button>;
                }

                return (
                     <Flex gap="2">
                        {mainActions}
                        {canBlock && (
                            <Button size="1" color="red" variant="outline" onClick={onBlock} title={t('placeholder.BlockUser')}>
                                <StopIcon />
                            </Button>
                        )}
                    </Flex>
                );
          }
      }
      // Non-host view or self-view: no actions needed in this list item
      return null; 
  };

  return (
    <Flex key={participant.sid} justify="between" align="center">
      <Flex align="center" gap="2">
        <Avatar
          size="1"
          fallback={participant.identity[0] ?? 'P'}
          radius="full"
        />
        <Text style={{ color: 'rgb(106, 186, 255)' }} size="2" className={isCurrentUser ? "text-accent-11 font-semibold" : ""}>
          {participant.identity}
          {isParticipantHost && `(${t('placeholder.Host')})`}
          {isCurrentUser && !isParticipantHost && `(${t('placeholder.You')})`}
        </Text>
      </Flex>
      {renderActions()}
    </Flex>
  );
}

export function PresenceDialog({
  children,
  isHost = false,
}: {
  children: React.ReactNode;
  isHost?: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const room = useRoomContext();
  const roomMetadata = useMemo(() => {
      try {
        return room.metadata ? JSON.parse(room.metadata) as RoomMetadata : null;
      } catch (e) {
        console.error("Failed to parse room metadata:", room.metadata, e);
        return null;
      }
  }, [room.metadata]);
  const allowParticipation = roomMetadata?.allow_participation ?? false;

  const hostIdentity = roomMetadata?.creator_identity;
  const host = participants.find(p => p.identity === hostIdentity);
  const others = participants.filter(p => p.identity !== hostIdentity);

  const onStageParticipants = others.filter(p => p.permissions?.canPublish);
  const viewers = others.filter(p => !p.permissions?.canPublish);

  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>
          <Flex justify="between" align="center">
            <div style={{ color: 'rgb(232, 233, 235, 1)' }}>{t('placeholder.WhosHere')}</div>
            <Dialog.Close>
              <IconButton variant="ghost" color="gray">
                <Cross1Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Dialog.Title>
        <Flex direction="column" gap="4" mt="4">
          {host && (
            <Flex direction="column" gap="2">
              <Text size="1" style={{ color: 'rgb(176, 180, 186)' }} className="uppercase font-bold text-gray-11">{t('placeholder.Host')}</Text>
              <ParticipantListItem
                  key={host.identity}
                  participant={host}
                  isCurrentUser={host.identity === localParticipant.identity}
                  isHost={isHost}
                  allowParticipation={allowParticipation}
                />
            </Flex>
          )}
          {onStageParticipants.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="1" style={{ color: 'rgb(176, 180, 186)' }} className="uppercase font-bold text-gray-11">{t('placeholder.OnStage')}</Text>
              {onStageParticipants.map((participant) => (
                <ParticipantListItem
                  key={participant.identity}
                  participant={participant}
                  isCurrentUser={participant.identity === localParticipant.identity}
                  isHost={isHost}
                  allowParticipation={allowParticipation}
                />
              ))}
            </Flex>
          )}
          {viewers.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="1" style={{ color: 'rgb(176, 180, 186)' }} className="uppercase font-bold text-gray-11">{t('placeholder.Viewers')} </Text>
              {viewers.map((participant) => (
                <ParticipantListItem
                  key={participant.identity}
                  participant={participant}
                  isCurrentUser={participant.identity === localParticipant.identity}
                  isHost={isHost}
                  allowParticipation={allowParticipation}
                />
              ))}
            </Flex>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
