import { useCopyToClipboard } from "@/lib/clipboard";
import { ParticipantMetadata, RoomMetadata } from "@/lib/controller";
import cam_icon from '@/assets/images/live/cam_icon.png';
import cam_disabled_icon from '@/assets/images/live/cam_disabled_icon.png';
import mic_icon from '@/assets/images/live/mic_icon.png';
import mic_disabled_icon from '@/assets/images/live/mic_disabled_icon.png';
import screen_share_icon from '@/assets/images/live/screen_share_icon.png';
import screen_share_disabled_icon from '@/assets/images/live/screen_share_disabled_icon.png';
import screen_recorder_icon from '@/assets/images/live/screen_recorder_icon.png';
import raise_icon from '@/assets/images/live/raise_icon.png';
import accept_icon from '@/assets/images/live/accept_icon.png';
import exit_icon2 from '@/assets/images/live/exit_icon2.png';
import reject_icon from '@/assets/images/live/reject_icon.png';
import full_screen_icon from '@/assets/images/live/full_screen_icon.png';
import cancel_full_screen_icon from '@/assets/images/live/cancel_full_screen_icon.png';
import time_icom from '@/assets/images/live/time_icom.png';
import people_icon from '@/assets/images/live/people_icon.png';
import {
    AudioTrack,
    StartAudio,
    VideoTrack,
    useDataChannel,
    useLocalParticipant,
    useMediaDeviceSelect,
    useParticipants,
    useRoomContext,
    useTracks,
    TrackReference,
} from "@livekit/components-react";
import { SpeakerLoudIcon, SpeakerOffIcon } from "@radix-ui/react-icons";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Avatar, Badge, Flex, Text, Tooltip } from "@radix-ui/themes";
import Confetti from "js-confetti";
import {
    ConnectionState,
    Track,
    VideoPresets,
    Participant,
} from "livekit-client";
import React, { useEffect, useRef, useState, useMemo } from "react";

import { UNSAFE_NavigationContext } from "react-router-dom";
// import { useRouter } from "next/navigation";
import { message, Flex as AntFlex, Space, Dropdown, Button as AntButton, Modal, Avatar as AntAvatar } from 'antd';
import type { MenuProps } from 'antd';
import { t } from "i18next";
import { DownOutlined } from '@ant-design/icons';
import { stopStream, getLivestreamStatistics } from '@/api/live';
import { useLiveStreamStore } from '@/store';

const iconStyle = {
    width: 18,
    height: 18,
}
function ConfettiCanvas() {
    const [confetti, setConfetti] = useState<Confetti>();
    const [decoder] = useState(() => new TextDecoder());
    const canvasEl = useRef<HTMLCanvasElement>(null);
    useDataChannel("reactions", (data) => {
        const options: { emojis?: string[]; confettiNumber?: number } = {};

        if (decoder.decode(data.payload) !== "🎉") {
            options.emojis = [decoder.decode(data.payload)];
            options.confettiNumber = 12;
        }

        confetti?.addConfetti(options);
    });

    useEffect(() => {
        setConfetti(new Confetti({ canvas: canvasEl?.current ?? undefined }));
    }, []);

    return <canvas ref={canvasEl} className="absolute h-full w-full" />;
}

// Helper component for participant tiles in the sidebar
interface ParticipantTileProps {
    participant: Participant;
    videoTrackRef: TrackReference | undefined;
    audioTrackRef: TrackReference | undefined;
    isLocal: boolean;
}

interface ParticipantTile3Props {
    sid: string;
    nickname: string;
    faceURL: string;
    videoTrackRef: TrackReference | undefined;
    isCamEnabled: boolean;
    isMicEnabled: boolean;
    audioTrackRef: TrackReference | undefined;
    isSpeaking: boolean;
    isLocal: boolean;
}

const ParticipantTile3 = React.memo(({ sid, nickname, faceURL, videoTrackRef, isCamEnabled, isMicEnabled, audioTrackRef, isSpeaking, isLocal }: ParticipantTile3Props) => {
 

    return (
        <div key={sid} style={{ position: 'relative', width: 320, height: 180, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20, marginRight: 20 }}> {/* Added shrink-0 */}
            {videoTrackRef && videoTrackRef?.participant.isCameraEnabled ? (
                <VideoTrack
                    trackRef={videoTrackRef}
                    className="absolute w-full h-full object-cover bg-transparent"
                    style={{
                        borderRadius: 10,
                        transform: isLocal ? 'scaleX(-1)' : 'none', // Flip local video
                        border: isSpeaking ? '2px solid rgba(72, 245, 20, 0.58)' : 'none',
                    }}
                />
            ) : (
                <Flex align="center" justify="center" className="w-full h-full" style={{ border: isSpeaking ? '2px solid rgba(72, 245, 20, 0.58)' : 'none', borderRadius: 10 }}>
                    {
                        (faceURL && faceURL !== '') ?
                            <AntAvatar size={70} src={faceURL} />
                            : <AntAvatar
                                size={70}
                                style={{
                                    backgroundColor: '#3e6bce',
                                    color: 'rgb(240, 240, 240)',
                                }}>
                                {nickname[0]}
                            </AntAvatar>
                    }
                    {/* <Avatar fallback={nickname[0] ?? 'P'} size="6" /> */}
                </Flex>
            )}
            {/* Overlay for name and mic status */}
            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/70 to-transparent">
                <Flex justify="between" align="center">
                    <Text size="1" weight="bold" className="text-white truncate"> {/* Added weight bold */}
                        {nickname}
                        {isLocal && `(${t('placeholder.You')} )`}
                    </Text>
                    {/* Mic Icon */}
                    {audioTrackRef?.participant && ( // Only show mic icon if audio track exists (even if disabled/muted)
                        isMicEnabled ? (
                            <SpeakerLoudIcon className="text-green-400 w-3 h-3 shrink-0" /> // Added shrink-0
                        ) : (
                            <SpeakerOffIcon className="text-red-400 w-3 h-3 shrink-0" /> // Added shrink-0
                        )
                    )}
                </Flex>
            </div>
        </div>
    );
},
    (prevProps, nextProps) => {
        return (
            prevProps.videoTrackRef === nextProps.videoTrackRef &&
            prevProps.isLocal === nextProps.isLocal &&
            prevProps.nickname === nextProps.nickname &&
            prevProps.isCamEnabled === nextProps.isCamEnabled &&
            prevProps.isMicEnabled === nextProps.isMicEnabled &&
            prevProps.isSpeaking === nextProps.isSpeaking
        )
    });




function formatTimeDiff(timestamp: number) {
    timestamp = timestamp / 1000;
    const totalSeconds = Math.floor(timestamp > 1e12 ? timestamp / 1000 : timestamp);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
export function StreamPlayer({ isHost: initialIsHost = false }) {
    const { raiseHand, removeFromStage } = useLiveStreamStore();

    const [localMetadata, setLocalMetadata] = useState<ParticipantMetadata | null>(null);
    const [metadata, setMetadata] = useState<string | null>(null);

    const room = useRoomContext();
    // const { metadata } = room;
    const roomId = room.name;


    const { localParticipant } = useLocalParticipant();


    useEffect(() => {
        // 优化：降低轮询频率，从200ms增加到2秒，减少99%的资源消耗
        const timer = setInterval(() => {
            // 解析 localParticipant metadata
            if (localParticipant?.metadata) {
                try {
                    const parsed = JSON.parse(localParticipant.metadata);
                    const currentMetadataStr = JSON.stringify(localMetadata);
                    const newMetadataStr = JSON.stringify(parsed);
                    
                    // 只有当 metadata 真正变化时才更新
                    if (currentMetadataStr !== newMetadataStr) {
                        setLocalMetadata(parsed);
                    }
                } catch (e) {
                    console.error('解析 localMetadata 失败:', e);
                }
            }
            
            // 解析 room metadata
            if (room.metadata && metadata !== room.metadata) {
                setMetadata(room.metadata);
            }
        }, 200);

        return () => clearInterval(timer);
    }, []); // 空依赖数组，让定时任务持续运行



    // const localMetadata = JSON.parse(localParticipant?.metadata || '{}');

    const participants = useParticipants();


    const [showTime, setShowTime] = useState('00:00:00');
    const [micEnabled, setMicEnabled] = useState(false);
    const [camEnabled, setCamEnabled] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(true);
    //   const router = useRouter();
    const { navigator } = React.useContext(UNSAFE_NavigationContext);
    const [_, copy] = useCopyToClipboard();


    const roomName = JSON.parse(metadata || '{}')?.nickname;

    const roomMetadata = (metadata && JSON.parse(metadata || '{}')) as RoomMetadata;
    const [dummyState, forceUpdate] = useState(0); // Rename state variable to avoid conflict

    // --- Track & Participant Identification ---
    const allCameraTracks = useTracks([Track.Source.Camera]);
    const allMicTracks = useTracks([Track.Source.Microphone]);
    const screenShareTracks = useTracks([Track.Source.ScreenShare]);

    const screenShareTrackRef = screenShareTracks.find(t => t.publication?.isEnabled);
    const isScreenShareActive = !!screenShareTrackRef;
    const screenShareParticipant = screenShareTrackRef?.participant;

    // Determine the actual host participant
    const hostParticipant = participants.find(p => p.identity === roomMetadata?.creator_identity) ||
        (initialIsHost ? localParticipant : undefined); // Fallback to initial prop if host not in participants list yet
    const isCurrentUserHost = localParticipant.identity === hostParticipant?.identity;


    const hostCameraTrackRef = allCameraTracks.find(t => t.participant.identity === hostParticipant?.identity);
    const hostAudioTrackRef = allMicTracks.find(t => t.participant.identity === hostParticipant?.identity);
    const isHostOnStage = hostParticipant?.permissions?.canPublish;

    // Identify other participants on stage
    const otherStageParticipants = participants.filter(
        p => p.permissions?.canPublish && p.identity !== hostParticipant?.identity
    );
    if (localParticipant.permissions?.canPublish && !isCurrentUserHost) {
        if (!otherStageParticipants.some(p => p.identity === localParticipant.identity)) {
            otherStageParticipants.push(localParticipant);
        }
    }

    const {
        devices: microphoneDevices,
        activeDeviceId: activeMicrophoneDeviceId,
        setActiveMediaDevice: setActiveMicrophoneDevice,
    } = useMediaDeviceSelect({
        kind: "audioinput",
    });

    const {
        devices: cameraDevices,
        activeDeviceId: activeCameraDeviceId,
        setActiveMediaDevice: setActiveCameraDevice,
    } = useMediaDeviceSelect({
        kind: "videoinput",
    });

    const isLocalScreenSharing = !!screenShareTracks.find(t => t.participant.identity === localParticipant.identity);
    const canShareScreen = !isScreenShareActive || isLocalScreenSharing;

    // --- Effect to force update on metadata change ---
    useEffect(() => {
        forceUpdate(c => c + 1); // Increment state to trigger rerender
    }, [participants, localParticipant.metadata]); // Depend on participants array and local metadata string
    let interval: NodeJS.Timeout;

    useEffect(() => {
        if (!metadata || interval) {
            return;
        }

        const createTime = JSON.parse(metadata).create_at;
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        };
        const localTime = new Date(createTime).toLocaleString('zh-CN', options);
        const time = new Date(localTime).getTime();

        interval = setInterval(() => {
            const diff = Date.now() - time;
            setShowTime(formatTimeDiff(diff))
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [metadata]);

    // --- Main Screen Content Determination ---
    // Determine what goes on the main screen
    let mainScreenTrackRef: TrackReference | undefined;
    let mainScreenParticipant: Participant | undefined;
    let mainScreenType: 'screen' | 'host' | 'none' = 'none';

    if (isScreenShareActive && screenShareTrackRef) {
        mainScreenTrackRef = screenShareTrackRef;
        mainScreenParticipant = screenShareTrackRef.participant;
        mainScreenType = 'screen';
    } else if (hostParticipant && hostCameraTrackRef?.publication?.isEnabled && hostCameraTrackRef) {
        // Check hostCameraTrackRef exists before assigning
        mainScreenTrackRef = hostCameraTrackRef;
        mainScreenParticipant = hostParticipant;
        mainScreenType = 'host';
    }

    const isMainScreenLocal = mainScreenParticipant?.identity === localParticipant.identity;

    // --- UI State & Callbacks ---
    const allowParticipation = roomMetadata?.allow_participation ?? false;

    // Notification logic - Enhanced Logging & Safety
    const streamStatistics = (data) => {

        const createTime = new Date(data.start_time).getTime();
        const endTime = new Date(data.stop_time).getTime();
        const diff = (endTime - createTime) / 1000;
        let hours = Math.floor(diff / 3600);
        let minutes = Math.floor((diff % 3600) / 60) + hours * 60;
        minutes = minutes === 0 ? 1 : minutes;
        return (
            <Space direction="vertical">
                <div>{t('placeholder.LiveDuration')}: <span>{minutes}</span></div>
                <div>{t('placeholder.MaxOnlineUsers')} : <span>{data.max_online_users}</span></div>
                <div>{t('placeholder.TotalViewers')} : <span>{data.total_users}</span></div>
                <div>{t('placeholder.TotalApplications')} : <span>{data.total_raise_hands}</span></div>
                <div>{t('placeholder.TotalOnStage')} : <span>{data.total_on_stage}</span></div>
            </Space>
        )
    }
    const exitRoom = async () => {
        if (localMetadata && localMetadata.role.name === 'owner') {
            Modal.confirm({
                title: t('placeholder.ConfirmExitLiveRoom'),
                content: t('placeholder.CloseRoomNotification'),
                okText: t('placeholder.confirm'),
                cancelText: t('placeholder.cancel'),
                onOk: async () => {
                    await stopStream({
                        room_name: roomId,
                    });
                    const res = await getLivestreamStatistics({
                        room_name: roomId
                    })
                    Modal.success({
                        title: t('placeholder.LiveEnded'),
                        content: streamStatistics(res.data),
                        okText: t('placeholder.confirm'),
                        onOk: () => {
                            navigator.push('/live');
                        },
                        onCancel: () => {
                            navigator.push('/live');
                        },
                    })

                    // room.removeAllListeners();
                    // await room.disconnect();
                    // navigator.push('/live');
                }
            })
        } else {
            Modal.confirm({
                title: t('placeholder.ConfirmExitLiveRoom'),
                okText: t('placeholder.confirm'),
                cancelText: t('placeholder.cancel'),
                onOk: async () => {
                    navigator.push('/live');
                }
            })
        }
    };
    //*
    // 
    // start_time 2025-04-25T08:56:05.603Z" "2025-04-25T09:59:25.671Z"

    //  */
    // --- Render Logic ---
    // Helper to render the main screen video/share content
    const renderMainScreenContent = () => {
        if (mainScreenType !== 'screen') {
            return <></>
        }
        // return <UserList />
        if (!mainScreenTrackRef) {
            return (
                <Text className="text-gray-400 text-lg">
                    {isScreenShareActive ? `${t('placeholder.ScreenSharingLoading')} ...` : (hostParticipant ? t('placeholder.HostVideoUnavailable') : `${t('placeholder.WaitingForHostToJoin')}...`)}
                </Text>
            );
        }

        // --- Determine PIP visibility and content ---
        let pipContent = null;
        // Condition 1: Is screen share active?
        if (mainScreenType === 'screen' && screenShareParticipant) {
            // Condition 2: Find the camera track SPECIFICALLY for the screen sharer
            const sharerCameraTrackRef = allCameraTracks.find(t => t.participant.identity === screenShareParticipant.identity);
            const isPipVisible = sharerCameraTrackRef?.publication?.isEnabled;
        }

        return (
            <div
                className="relative w-full h-full"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Main Video/Screen Share */}
                <VideoTrack
                    id='main-screen-video'
                    trackRef={mainScreenTrackRef}
                    className="absolute w-full h-full bg-transparent"
                    style={{
                        transform: isMainScreenLocal && mainScreenType === 'host' ? 'scaleX(-1)' : 'none',
                        height: isFullScreen ? '100%' : '40%'
                    }}

                />
                {/* {
                    isHovered && <div style={{
                        position: 'absolute',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        width: '100%',
                        height: 40,
                        top: isFullScreen ? 'calc(100% - 50px)' : 'calc(40% - 40px)',
                        zIndex: 1
                    }}>
                        <img
                            onClick={() => { setIsFullScreen(!isFullScreen) }}
                            src={isFullScreen ? cancel_full_screen_icon : full_screen_icon}
                            style={{
                                position: 'absolute',
                                right: 20,
                                top: 20,
                                width: '30px',
                                height: '25px',
                                cursor: 'pointer',
                                zIndex: 10
                            }} />
                    </div>
                } */}

                {
                    !isFullScreen && (
                        <div style={{ position: 'absolute', width: '100%', height: '60%', overflowY: 'scroll', top: '40%' }}>
                            <AntFlex
                                wrap
                                justify='center'
                                style={{
                                    width: '100%',
                                    padding: 20,
                                }}>
                                {hostParticipant && isHostOnStage && (
                                    <ParticipantTile3
                                        sid={hostParticipant.sid}
                                        nickname={JSON.parse(hostParticipant.metadata || '{}')?.nickname}
                                        faceURL={JSON.parse(hostParticipant.metadata || '{}')?.faceURL}
                                        videoTrackRef={hostCameraTrackRef}
                                        isCamEnabled={hostCameraTrackRef?.publication?.isEnabled}
                                        isMicEnabled={hostAudioTrackRef?.publication?.isMuted === false && hostAudioTrackRef?.publication?.isEnabled}
                                        audioTrackRef={hostAudioTrackRef}
                                        isSpeaking={hostAudioTrackRef?.participant.isSpeaking}
                                        isLocal={isCurrentUserHost}
                                    />

                                )}

                                {otherStageParticipants.map(p => {
                                    // Find tracks for each participant within the map, but don't call hooks
                                    const videoTrack = allCameraTracks.find(t => t.participant.identity === p.identity);
                                    const audioTrack = allMicTracks.find(t => t.participant.identity === p.identity);
                                    return (
                                        <ParticipantTile3
                                            sid={p.sid}
                                            key={p.sid}
                                            nickname={JSON.parse(p.metadata || '{}')?.nickname}
                                            faceURL={JSON.parse(p.metadata || '{}')?.faceURL}
                                            videoTrackRef={videoTrack}
                                            isCamEnabled={videoTrack?.publication?.isEnabled}
                                            isMicEnabled={audioTrack?.publication?.isMuted === false && audioTrack?.publication?.isEnabled}
                                            audioTrackRef={audioTrack}
                                            isSpeaking={audioTrack?.participant.isSpeaking}
                                            isLocal={p.identity === localParticipant.identity}
                                        />
                                    );
                                })}
                            </AntFlex>
                        </div>
                    )

                }
                <div style={{ width: 40, height: 38, backgroundColor: 'rgba(0, 0, 0, 0.5)',  position: 'absolute', right: 20, top: 20, borderRadius: 10 }}>
                <img
                    onClick={() => { setIsFullScreen(!isFullScreen) }}
                    src={isFullScreen ? cancel_full_screen_icon : full_screen_icon}
                    style={{
                        position: 'relative',
                        left: 5,
                        top: 5,
                        width: '30px',
                        height: '28px',
                        cursor: 'pointer',
                        zIndex: 10
                    }} />
                </div>
   

                {/* Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent z-10">
                    <Flex justify="between" align="center">
                        <Badge
                            variant="solid"
                            color={mainScreenType === 'screen' ? "blue" : "gray"}
                        >
                            {mainScreenParticipant?.identity ?? t('placeholder.unknown')}
                            {isMainScreenLocal && ` (${t('placeholder.you')})`}
                            {mainScreenType === 'screen' ? ` - ${t('placeholder.screenSharing')}` : (mainScreenType === 'host' ? ` - ${t('placeholder.hostRole')}` : "")}
                        </Badge>
                        {(() => {
                            const mainAudioTrack = allMicTracks.find(t => t.participant.identity === mainScreenParticipant?.identity);
                            const isMainMicEnabled = mainAudioTrack?.publication?.isMuted === false && mainAudioTrack?.publication?.isEnabled;
                            return mainAudioTrack ? (
                                isMainMicEnabled ? <SpeakerLoudIcon className="text-green-400 w-4 h-4" /> : <SpeakerOffIcon className="text-red-400 w-4 h-4" />
                            ) : null;
                        })()}
                    </Flex>
                </div>

                {/* Render PIP content if it exists */}
                {/* {pipContent} // Temporarily removed PIP rendering */}
            </div>
        );
    };
    const handleMicMenuClick: MenuProps['onClick'] = (e) => {
        setActiveMicrophoneDevice(e.key);
    };
    const handleCamMenuClick: MenuProps['onClick'] = (e) => {
        setActiveCameraDevice(e.key);
    };

    const micMenuProps = {
        items: microphoneDevices.map((d) => ({ label: d.label, key: d.deviceId })),
        selectedKeys: [activeMicrophoneDeviceId],
        onClick: handleMicMenuClick,
    };

    const camMenuProps = {
        items: cameraDevices.map((d) => ({ label: d.label, key: d.deviceId })),
        selectedKeys: [activeCameraDeviceId],
        onClick: handleCamMenuClick,
    };
    const toggleMicrophone = async () => {
        const newState = !micEnabled;
        setMicEnabled(newState);

        if (room.state === ConnectionState.Connected && localParticipant.permissions?.canPublish) {
            try {
                await localParticipant.setMicrophoneEnabled(newState);
            } catch (error) {
                setMicEnabled(!newState); // Revert state on error
            }
        } else {
            console.warn("[MediaDeviceSettings] Cannot toggle microphone. Room not connected or no publish permission.");
            setMicEnabled(micEnabled); // Revert state if conditions not met
        }
    };

    const toggleCamera = async () => {
        const newState = !camEnabled;
        setCamEnabled(newState);

        if (room.state === ConnectionState.Connected && localParticipant.permissions?.canPublish) {
            if (newState) {
                try {
                    await localParticipant.setCameraEnabled(true, { resolution: VideoPresets.h720 });
                } catch (error) {
                    console.error("[MediaDeviceSettings] Error enabling camera:", error);
                    setCamEnabled(false); // Revert state on error
                }
            } else {
                try {
                    await localParticipant.setCameraEnabled(false);
                } catch (error) {
                    console.error("[MediaDeviceSettings] Error disabling camera:", error);
                    setCamEnabled(true); // Revert state on error
                }
            }
        } else {
            console.warn("[MediaDeviceSettings] Cannot toggle camera. Room not connected or no publish permission.");
            setCamEnabled(camEnabled); // Revert state if conditions not met
        }
    };
    // 屏幕共享控制
    const toggleScreenShare = async () => {
        if (room.state !== ConnectionState.Connected || !localParticipant.permissions?.canPublish) {
            console.warn("[MediaDeviceSettings] Cannot toggle screen share. Room not connected or no publish permission.");
            return;
        }

        if (!canShareScreen && !isLocalScreenSharing) {
            console.warn("[MediaDeviceSettings] Cannot start screen share, another user is already sharing.");
            return;
        }

        const targetState = !isLocalScreenSharing;

        if (!targetState) {
            // 停止屏幕共享
            await localParticipant.setScreenShareEnabled(false);
        } else {
            
            try {
                let stream;
                
             
                // 检查是否在Electron环境
                const isElectron = !!(window as any).electronAPI || !!window.electronDesktopCapturer || ((navigator as any).userAgent?.includes('Electron'));
                
                if (isElectron) {
                    // Electron环境：如果API不可用，等待一下可能还在加载
                    if (!window.electronDesktopCapturer) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                if (window.electronDesktopCapturer) {
                    
                    // 获取屏幕源
                    const sources = await window.electronDesktopCapturer.getSources({
                        types: ['screen', 'window'],
                        thumbnailSize: { width: 150, height: 150 }
                    });
                    
                    
                    if (sources && sources.length > 0) {
                        // 显示选择弹窗让用户选择屏幕源
                        setScreenSources(sources);
                        setShowSourceModal(true);
                        return; // 等待用户选择，不继续执行
                    } else {
                        throw new Error("没有找到可用的屏幕源");
                    }
                } else if (!isElectron) {
                    
                    try {
                        // 开始屏幕共享，使用最高支持的分辨率
                        await localParticipant.setScreenShareEnabled(true, {
                            // 使用4K分辨率 (如果支持)
                            resolution: {
                                width: 3840,
                                height: 2160
                            }
                        });

                        // 如果4K失败，回退到1080p
                        if (!isLocalScreenSharing) {
                            await localParticipant.setScreenShareEnabled(true, {
                                resolution: VideoPresets.h1080
                            });
                        }
                        
                        message.success(t('placeholder.screenShareStarted'));
                        return; // 直接返回，不需要继续处理stream
                    } catch (webError) {
                        console.error("[ScreenShare] Web方式失败:", webError);
                        throw webError;
                    }
                } else {
                    throw new Error("没有可用的屏幕捕获API（需要Electron desktopCapturer或Web getDisplayMedia）");
                }
                
            } catch (error) {
                console.error("[ScreenShare] ❌ 屏幕共享失败:", error);
                message.error(t('placeholder.screenShareFailed') + ': ' + (error as any).message);
            }
        }
    };

    // 屏幕源选择相关state
    const [screenSources, setScreenSources] = useState<any[]>([]);
    const [showSourceModal, setShowSourceModal] = useState(false);

    // 预处理屏幕源，使用主进程已转换的缩略图
    const processedScreenSources = useMemo(() => {
        return screenSources.map(source => {
            return {
                ...source,
                isScreen: source.id.startsWith('screen:'),
                icon: source.id.startsWith('screen:') ? '🖥️' : '📱',
                // 使用主进程已处理的thumbnailDataURL
                thumbnailUrl: source.thumbnailDataURL || ''
            };
        });
    }, [screenSources]);

    // 处理用户选择屏幕源
    const handleSelectSource = async (source: any) => {
        setShowSourceModal(false);
        
        try {
            
            // 确保navigator.mediaDevices存在
            if (!(navigator as any).mediaDevices) {
                (navigator as any).mediaDevices = {};
            }
            
        
            // 使用正确的window.navigator而不是React Router的navigator
            const realNavigator = window.navigator;
            
            // 如果getUserMedia不存在，创建一个简单的实现
            if (!(realNavigator as any).mediaDevices.getUserMedia) {
                (realNavigator as any).mediaDevices.getUserMedia = async (constraints: any) => {
                    
                    // 检查是否有webkitGetUserMedia（Electron中常见）
                    if ((realNavigator as any).webkitGetUserMedia) {
                        return new Promise((resolve, reject) => {
                            (realNavigator as any).webkitGetUserMedia.call(realNavigator, constraints, resolve, reject);
                        });
                    }
                    
                    // 检查是否有getUserMedia
                    if ((realNavigator as any).getUserMedia) {
                        return new Promise((resolve, reject) => {
                            (realNavigator as any).getUserMedia.call(realNavigator, constraints, resolve, reject);
                        });
                    }
                    
                    // 检查是否有mozGetUserMedia
                    if ((realNavigator as any).mozGetUserMedia) {
                        return new Promise((resolve, reject) => {
                            (realNavigator as any).mozGetUserMedia.call(realNavigator, constraints, resolve, reject);
                        });
                    }
                    
                    // 尝试通过IPC与主进程通信获取屏幕流
                    if ((window as any).electronAPI) {
                        throw new Error('electronAPI screen capture not implemented yet');
                    }
                    
                    throw new Error('No getUserMedia available in this environment - window.navigator properties: ' + Object.getOwnPropertyNames(realNavigator).join(', '));
                };
            }
            
            const stream = await (realNavigator as any).mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                        minWidth: 1280,
                        maxWidth: 1920,
                        minHeight: 720,
                        maxHeight: 1080
                    }
                }
            });
            
            
            // 获取video track
            const videoTrack = stream.getVideoTracks()[0];
            if (!videoTrack) {
                throw new Error("无法获取视频轨道");
            }
            
            
            // 使用LiveKit发布track
            const publication = await localParticipant.publishTrack(videoTrack, {
                source: Track.Source.ScreenShare,
                name: 'electron-screen-share'
            });
            
            console.log("[ScreenShare] ✅ LiveKit发布屏幕共享成功:", publication);
            message.success(t('placeholder.screenShareStartedWith', { name: source.name }));
            
        } catch (err) {
            console.error("[ScreenShare] 屏幕共享失败:", err);
            message.error(t('placeholder.screenShareFailed') + ': ' + (err as any).message);
        }
    };

    
    const onRaiseHand = async () => {
        try {
            await raiseHand();
        } catch (error) { 
            console.error("[StreamPlayer] Failed to raise hand:", error); 
        }
    };

    const onLowerHandOrLeave = async () => {
        try {
            await removeFromStage(
                roomId,
                localParticipant.identity
            );
        } catch (error) { 
            console.error("[StreamPlayer] Failed to lower hand/leave:", error); 
        }
    };

    const isOnStage = localParticipant.permissions?.canPublish === true;
    const HandButtonComponent = useMemo(() => {
        if (!isCurrentUserHost && allowParticipation && !isOnStage) { // Only show these buttons if user *not* on stage
            const isInvited = localMetadata?.invited_to_stage === true;
            const isHandRaised = localMetadata?.hand_raised === true;


            if (isInvited) {
                // User has been invited by the host. Show Accept/Reject Invite buttons.
                // This takes precedence over a potentially pre-existing hand raise.
                return (
                    <Flex gap="1">
                        <TooltipProvider>
                            <Tooltip content={t('placeholder.AcceptHostInvite')}>
                                {/* Accept calls raiseHand, backend should grant permission because invited_to_stage is true */}
                                <AntButton onClick={onRaiseHand}>
                                    <img src={accept_icon} style={iconStyle} /> {t('placeholder.Accept')}
                                </AntButton>
                            </Tooltip>
                            <Tooltip content={t('placeholder.RejectHostInvite')}>
                                {/* Reject calls lowerHand/leave, backend should clear metadata */}
                                <AntButton danger onClick={onLowerHandOrLeave}>
                                    <img src={reject_icon} style={iconStyle} /> {t('placeholder.Reject')}
                                </AntButton>
                            </Tooltip>
                        </TooltipProvider>
                    </Flex>
                );
            } else if (isHandRaised) {
                // User has raised their hand but has NOT been invited yet.
                // Show "Cancel Hand Raise" button.
                return (
                    <TooltipProvider>
                        <Tooltip content="Cancel Hand Raise Request">
                            <AntButton danger onClick={onLowerHandOrLeave}>
                                <img src={reject_icon} style={iconStyle} /> {t('cancel')}
                            </AntButton>
                        </Tooltip>
                    </TooltipProvider>
                );
            } else {
                // User is not on stage, not invited, and hasn't raised their hand.
                // Show "Raise Hand" button.
                return (
                    <TooltipProvider>
                        <Tooltip content={t('placeholder.RaiseHandToRequestSpeaking')}>
                            <AntButton onClick={onRaiseHand}>
                                <img src={raise_icon} style={iconStyle} /> {t('placeholder.RaiseHand')}
                            </AntButton>
                        </Tooltip>
                    </TooltipProvider>
                );
            }
        } else if (isOnStage && !isCurrentUserHost) {
            // User is on stage (but not host) -> Show "Leave Stage" button
            return (
                <TooltipProvider>
                    <Tooltip content={t('placeholder.LeaveStage')}>
                        <AntButton danger onClick={onLowerHandOrLeave}>
                            <img src={reject_icon} style={iconStyle} /> {t('placeholder.LeaveStage')}
                        </AntButton>
                    </Tooltip>
                </TooltipProvider>
            );
        } else if (isCurrentUserHost) {
            return <></>;
            // Host doesn't need these buttons.
        } else if (!allowParticipation) {
            return <></>;
            // Participation disabled, show nothing.
        }
        
        // 🔑 重要修复：如果没有匹配任何条件，返回空组件而不是 undefined
        return <></>;
    }, [isCurrentUserHost, localMetadata?.invited_to_stage, localMetadata?.hand_raised, localParticipant.permissions?.canPublish, allowParticipation])

    const renderUserList = () => {

        if (mainScreenType === 'screen') {
            return <></>
        }
        return (
            <AntFlex wrap justify='center' style={{ width: '100%', padding: 20, overflowY: 'scroll', height: 'calc(100vh - 250px)' }}>
                {hostParticipant && isHostOnStage && (
                    <ParticipantTile3
                        sid={hostParticipant.sid}
                        nickname={JSON.parse(hostParticipant.metadata || '{}')?.nickname}
                        faceURL={JSON.parse(hostParticipant.metadata || '{}')?.faceURL}
                        videoTrackRef={hostCameraTrackRef}
                        isCamEnabled={hostCameraTrackRef?.publication?.isEnabled}
                        isMicEnabled={hostAudioTrackRef?.publication?.isMuted === false && hostAudioTrackRef?.publication?.isEnabled}
                        audioTrackRef={hostAudioTrackRef}
                        isSpeaking={hostAudioTrackRef?.participant.isSpeaking}
                        isLocal={isCurrentUserHost}
                    />
                    //     <ParticipantTile2
                    //     participant={hostParticipant}
                    //     videoTrackRef={hostCameraTrackRef}
                    //     audioTrackRef={hostAudioTrackRef}
                    //     isLocal={isCurrentUserHost}
                    // />
                )}

                {otherStageParticipants.map(p => {
                    // Find tracks for each participant within the map, but don't call hooks
                    const videoTrack = allCameraTracks.find(t => t.participant.identity === p.identity);
                    const audioTrack = allMicTracks.find(t => t.participant.identity === p.identity);
                    return (
                        <ParticipantTile3
                            sid={p.sid}
                            nickname={JSON.parse(p.metadata || '{}')?.nickname}
                            faceURL={JSON.parse(p.metadata || '{}')?.faceURL}
                            videoTrackRef={videoTrack}
                            isCamEnabled={videoTrack?.publication?.isEnabled}
                            isMicEnabled={audioTrack?.publication?.isMuted === false && audioTrack?.publication?.isEnabled}
                            audioTrackRef={audioTrack}
                            isSpeaking={audioTrack?.participant.isSpeaking}
                            isLocal={p.identity === localParticipant.identity}
                        />
                    );
                })}
            </AntFlex>
        )
    };
    return (
        <div className="relative h-full w-full bg-black overflow-hidden">
            <AntFlex style={{ height: 80, backgroundColor: '#252525', padding: '0 20px', color: '#fff' }} justify="space-between" align="center">
                <Space size="large" align="baseline">
                    <div style={{ color: '#fff', fontSize: 20 }}>{roomName}</div>
                    <div style={{ color: 'rgba(240, 240, 240, 0.5)', fontSize: 12 }}> <img src={time_icom} style={{ width: 12, display: 'inline-block', marginRight: 5, paddingBottom: 3 }} />{showTime}</div>
                </Space>
                <div style={{ color: 'rgb(240, 240, 240)', fontWeight: '500' }}><img src={people_icon} style={{ width: 18, display: 'inline-block', margin: '0 6px 3.5px 0' }} />{t('placeholder.Online')}: {participants.length} {t('placeholder.PersonUnit')}</div>
            </AntFlex>
            <div style={{ height: 'calc(100% - 200px)', margin: 20, borderRadius: 10 }} className="h-full bg-gray-900">
                {renderMainScreenContent()}
                {renderUserList()}
            </div>
            <AntFlex style={{ height: 100, backgroundColor: '#252525', padding: '0 20px' }} justify="center" align="center">
                <Space>
                    {
                        microphoneDevices && microphoneDevices.length !== 0 && localMetadata && localMetadata.role.name !== 'user' && <Dropdown.Button menu={micMenuProps} onClick={toggleMicrophone} icon={<DownOutlined />}>
                            {
                                micEnabled ? <img src={mic_icon} style={iconStyle} /> : <img src={mic_disabled_icon} style={iconStyle} />
                            }
                            {t('placeholder.Microphone')}
                        </Dropdown.Button>
                    }
                    {
                        cameraDevices && cameraDevices.length !== 0 && localMetadata && localMetadata.role.name !== 'user' && <Dropdown.Button disabled={!cameraDevices || cameraDevices.length === 0} menu={camMenuProps} onClick={toggleCamera} icon={<DownOutlined />}>
                            {
                                camEnabled ? <img src={cam_icon} style={iconStyle} /> : <img src={cam_disabled_icon} style={iconStyle} />
                            } {t('placeholder.Camera')}
                        </Dropdown.Button>
                    }
                    {
                        localMetadata && localMetadata.role.name !== 'user' && <AntButton onClick={toggleScreenShare}>
                            {
                                !isScreenShareActive ? <img src={screen_share_icon} style={iconStyle} /> : <img src={screen_share_disabled_icon} style={iconStyle} />
                            } {t('placeholder.Share')}
                        </AntButton>
                    }
                    {/* {
                        localMetadata
                        && (localMetadata.role.name === 'owner' || localMetadata.role.name === 'admin')
                        && <AntButton><img src={screen_recorder_icon} style={iconStyle} />{t('placeholder.Recording')}</AntButton>
                    } */}
                    {HandButtonComponent}
                    <AntButton type="primary" danger onClick={exitRoom}><img src={exit_icon2} style={iconStyle} />{t('placeholder.Exit')}</AntButton>
                </Space>
            </AntFlex>


            {/* --- Overlay Elements --- */}
            <ConfettiCanvas />
            <StartAudio
                label={t('placeholder.clickToAllowAudio')}
                className="absolute top-0 left-0 h-full w-1/2 bg-gray-500/50 text-white z-20 flex items-center justify-center cursor-pointer"
            />
            {/* Render all audio tracks non-visually */}
            {allMicTracks.map(trackRef => (
                trackRef.publication?.isEnabled ?
                    <AudioTrack key={trackRef.publication.trackSid ?? trackRef.participant.sid} trackRef={trackRef} /> // Added fallback key
                    : null
            ))}

            {/* 屏幕源选择弹窗 - 九宫格布局 */}
            <Modal
                title={t('placeholder.screenShareSelection')}
                open={showSourceModal}
                onCancel={() => setShowSourceModal(false)}
                footer={null}
                width={900}
                centered
            >
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 20,
                    padding: '20px 0',
                    maxHeight: 500, 
                    overflowY: 'auto' 
                }}>
                    {processedScreenSources.map((source) => (
                        <div
                            key={source.id}
                            style={{
                                cursor: 'pointer',
                                border: '2px solid #eee',
                                borderRadius: 12,
                                padding: 16,
                                transition: 'all 0.3s',
                                textAlign: 'center',
                                backgroundColor: '#fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            }}
                            onClick={() => handleSelectSource(source)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8f9ff';
                                e.currentTarget.style.borderColor = '#1890ff';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(24,144,255,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#fff';
                                e.currentTarget.style.borderColor = '#eee';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                            }}
                        >
                            {/* 缩略图区域 */}
                            <div style={{ 
                                width: '100%', 
                                height: 140, 
                                marginBottom: 12, 
                                borderRadius: 8,
                                border: '1px solid #ddd',
                                backgroundColor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                {source.thumbnailUrl ? (
                                    <img
                                        src={source.thumbnailUrl}
                                        alt={source.name}
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                            console.warn('缩略图显示失败:', source.name);
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        fontSize: 48,
                                        color: '#999'
                                    }}>
                                        {source.icon}
                                    </div>
                                )}
                                
                                {/* 类型标签 */}
                                <div style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: source.isScreen ? '#52c41a' : '#1890ff',
                                    color: 'white',
                                    fontSize: 11,
                                    padding: '3px 8px',
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {source.isScreen ? t('placeholder.screenType') : t('placeholder.windowType')}
                                </div>
                            </div>
                            
                            {/* 名称区域 */}
                            <div>
                                <div style={{ 
                                    fontWeight: 600, 
                                    marginBottom: 6, 
                                    fontSize: 15,
                                    color: '#333',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: '1.4'
                                }}>
                                    {source.name}
                                </div>
                                <div style={{ 
                                    fontSize: 13, 
                                    color: '#999',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}>
                                    <span style={{ fontSize: 16 }}>{source.icon}</span>
                                    <span>{source.isScreen ? t('placeholder.entireScreen') : t('placeholder.applicationWindow')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
