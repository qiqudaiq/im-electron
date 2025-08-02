import React, { useState, useEffect } from 'react';
import { Space, Avatar, Flex, Button, Modal } from 'antd';
import { liveStreamAPI } from '@/api/live';
import { t } from "i18next";

const ViewerItem = (props:any) => {
    const { item, current, room_name } = props;
    const [isHovered, setIsHovered] = useState(false);
    const [blinkState, setBlinkState] = useState(false);
    const [showOpt, setShowOpt] = useState(false);


    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        let state = false
        setShowOpt(item.hand_raised);
        if (item.hand_raised && !timer && current.role.name !== 'user' && current.role.name !== 'publisher') {
            timer = setInterval(() => {
                state = !state;
                setBlinkState(state);
            }, 500)
        }
        return () => {
            clearInterval(timer);
        }
    }, [item.hand_raised])


    const invite = () => {
        liveStreamAPI.inviteToStage({
            room_name,
            identity: item.identity,
        });
    };
    const cancelInvite = () => {
        liveStreamAPI.removeFromStage({
            room_name,
            identity: item.identity,
        });
    };
    const handleSetAsAdmin = () => {
        liveStreamAPI.setAsAdmin({
            room_name,
            identity: item.identity,
        });
    };
    const handleRevokeAdmin = () => {
        liveStreamAPI.revokeAdmin({
            room_name,
            identity: item.identity,
        });

    }
    const kick = () => {
        if (item.role.name === 'admin') {
            handleRevokeAdmin();
        } else {
            liveStreamAPI.removeFromStage({
                room_name,
                identity: item.identity,
            });
        }
    };
    const ban = () => {
        liveStreamAPI.blockViewer({
            room_name,
            identity: item.identity,
        });
    };
    const accept = () => {
        liveStreamAPI.approveHandRaise({
            room_name,
            identity: item.identity,
        });
    };
    const reject = () => {
        liveStreamAPI.removeFromStage({
            room_name,
            identity: item.identity,
        });
    };
    const ownerBtn = () => {
        if (current.identity === item.identity) {
            return <></>
        }
        const btnList = [];
        if (item.role.name === 'admin' || item.role.name === 'publisher') {
            btnList.push(
                <Button size="small" type="text">
                    <span style={{ color: '#108ee9' }} onClick={() => {
                        Modal.confirm({
                            title: t('placeholder.ConfirmRemoveUser'),
                            okText: '确定',
                            cancelText: '取消',
                            onOk() {
                                kick();
                            },
                            onCancel() {
                            },
                        });
                    }}>{t('placeholder.Remove')}</span>
                </Button>
            )
        } 
        if (item.role.name === 'publisher' || item.role.name === 'user') {
            btnList.push(
                <Button size="small" type="text" style={{ display: showOpt ? 'none' : '' }}>
                    <span style={{ color: '#108ee9' }} onClick={() => {
                        Modal.confirm({
                            title: t('placeholder.ConfirmSetAsModerator'),
                            content: t('placeholder.ModeratorPermissions'),
                            okText: '确定',
                            cancelText: '取消',
                            onOk() {
                                handleSetAsAdmin();
                            },
                            onCancel() {
                            }
                        })
                    }}>{t('placeholder.SetAsModerator')}</span>
                </Button>
            )
        }

        if (item.role.name === 'user') {
            if (item.invited_to_stage) {
                btnList.push(
                    <Button size="small" type="text">
                        <span style={{ color: '#108ee9' }} onClick={cancelInvite}>{t('placeholder.CancelInvitation')}</span>
                    </Button>
                )
            } else if (item.hand_raised) {
                btnList.push(
                    <>
                        <Button size="small" type="text">
                            <span style={{ color: '#108ee9' }} onClick={accept}>{t('placeholder.Agree')}</span>
                        </Button>
                        <Button size="small" type="text">
                            <span style={{ color: '#108ee9' }} onClick={reject}>{t('application.refuse')}</span>
                        </Button>
                    </>
                )
            } else {
                btnList.push(
                    <Button size="small" type="text">
                        <span style={{ color: '#108ee9' }} onClick={invite}>{t('placeholder.invitation')}</span>
                    </Button>
                )
            }

        }

        btnList.push(
            <Button size="small" type="text" onClick={() => {
                Modal.confirm({
                    title: t('placeholder.ConfirmBlockUser'),
                    content: t('placeholder.BlockUserWarning'),
                    okText: '确定',
                    cancelText: '取消',
                    onOk() {
                        ban();
                    },
                    onCancel() {
                    },
                });
            }}>
                <span style={{ color: '#108ee9' }}>{t('placeholder.Block')}</span>
            </Button>
        )

        return btnList;
    };
    const adminBtn = () => {
        if (current.identity === item.identity) {
            return <></>
        }
        const btnList = [];
        if (item.role.name === 'publisher') {
            btnList.push(
                <Button size="small" type="text">
                    <span style={{ color: '#108ee9' }} onClick={() => {
                        Modal.confirm({
                            title: t('placeholder.ConfirmRemoveUser'),
                            okText: '确定',
                            cancelText: '取消',
                            onOk() {
                                kick();
                            },
                            onCancel() {
                            },
                        });
                    }}>{t('placeholder.Remove')}</span>
                </Button>
            )
        }
        if (item.role.name === 'user') {
            if (item.invited_to_stage) {
                btnList.push(
                    <Button size="small" type="text">
                        <span style={{ color: '#108ee9' }} onClick={cancelInvite}>{t('placeholder.CancelInvitation')}</span>
                    </Button>
                )
            } else if (item.hand_raised) {
                btnList.push(
                    <>
                        <Button size="small" type="text">
                            <span style={{ color: '#108ee9' }} onClick={accept}>{t('placeholder.Agree')}</span>
                        </Button>
                        <Button size="small" type="text">
                            <span style={{ color: '#108ee9' }} onClick={reject}>{t('application.refuse')}</span>
                        </Button>
                    </>
                )
            } else {
                btnList.push(
                    <Button size="small" type="text">
                        <span style={{ color: '#108ee9' }} onClick={invite}>{t('placeholder.invitation')}</span>
                    </Button>
                )
            }

        }

        if (item.role.name !== 'owner') {
            btnList.push(
                <Button size="small" type="text">
                    <span style={{ color: '#108ee9' }} onClick={() => {
                        Modal.confirm({
                            title: t('placeholder.ConfirmBlockUser'),
                            content: t('placeholder.BlockUserWarning'),
                            okText: '确定',
                            cancelText: '取消',
                            onOk() {
                                ban();
                            },
                            onCancel() {
                            },
                        });
                    }}>{t('placeholder.Block')}</span>
                </Button>
            )
        }
        return btnList;
    };
    const ownerTag = () => <span style={{
        backgroundColor: '#108ee9',
        display: 'inline-block',
        lineHeight: '17px',
        // width: 45,
        borderRadius: 17,
        textAlign: 'center',
        fontSize: 12,
        marginLeft: 8,
        padding:2
    }}>{t('placeholder.RoomOwner')}</span>;

    const adminTag = () => <span style={{
        backgroundColor: '#108ee9',
        display: 'inline-block',
        lineHeight: '17px',
        // width: 45,
        borderRadius: 17,
        textAlign: 'center',
        fontSize: 12,
        marginLeft: 8,
        padding:2
    }}>{t('placeholder.RoomManager')}</span>;

    return (
        <Space
            style={{
                padding: 10,
                cursor: 'pointer',
                backgroundColor: isHovered ? 'rgba(16, 142, 233, 0.15)' : 'transparent',
                borderRadius: 8,
                transition: 'background-color 0.3s'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {
                (item.faceURL && item.faceURL !== '') ?
                    <Avatar style={{ opacity: blinkState ? 0.5 : 1 }} size={40} src={item.faceURL} />
                    : <Avatar
                        size={40}
                        style={{
                            backgroundColor: '#3e6bce',
                            color: 'rgb(240, 240, 240)',
                            opacity: blinkState ? 0.5 : 1,
                        }}>
                        {item.nickname[0]}
                    </Avatar>
            }
            <Flex justify="space-between" align="center" style={{ width: 310 }}>
                <Space direction="vertical">
                    <div style={{ color: 'rgb(240, 240, 240)' }}>
                        {item.nickname}
                        {item.role.name === 'admin' && adminTag()}
                        {item.role.name === 'owner' && ownerTag()}
                    </div>
                </Space>
                {(isHovered || showOpt) && (
                    <Space size={1}>
                        {current.role.name === 'admin' && adminBtn()}
                        {current.role.name === 'owner' && ownerBtn()}
                    </Space>
                )}
            </Flex>
        </Space>
    );
};

export default ViewerItem;