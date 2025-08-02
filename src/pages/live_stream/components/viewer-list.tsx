import { useState, useEffect } from "react";
import {
    useLocalParticipant,
    useParticipants,
    useRoomInfo,
    useRoomContext
} from "@livekit/components-react";
import { Input, Space, Button, message } from 'antd';
import { SearchOutlined } from "@ant-design/icons";
import '../styles/index.css';
import ViewerItem from "./viewer-item";
import { useCopyToClipboard } from "@/lib/clipboard";
import { t } from "i18next";
/**
 * owner
 * admin
 * publisher
 * user
 * @returns 
 */
const ViewerList = () => {
    const [searchText, setSearchText] = useState('');
    const [currentUser, setCurrentUser] = useState();
    const [userGroup, setUserGroup] = useState({
        owner: [],
        admin: [],
        publisher: [],
        user: []
    });

    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();
    const roomInfo = useRoomInfo();
    const [_, copy] = useCopyToClipboard();
    
    // 获取房间上下文来获取正确的房间名称
    const room = useRoomContext();
        

    
    useEffect(() => {

        if (!localParticipant.metadata || !participants) {
            return;
        }
        const current = JSON.parse(localParticipant.metadata);
        current.identity = localParticipant.identity;
        setCurrentUser(current);
        const totalList = participants.map(v => ({
            ...JSON.parse(v.metadata),
            identity: v.identity,
        }));


        const owner = totalList.filter((v: any) => v.role.name === 'owner');
        const admin = totalList.filter((v: any) => v.role.name === 'admin');
        const publisher = totalList.filter((v: any) => v.role.name === 'publisher');
        const user = totalList.filter((v: any) => v.role.name === 'user');

        setUserGroup({
            owner,
            admin,
            publisher,
            user
        })
    }, [localParticipant, participants])


    const search = () => {
        const totalList = participants.map(v => ({
            ...JSON.parse(v.metadata),
            identity: v.identity,
        }));
        const owner = totalList.filter((v: any) => v.role.name === 'owner' && v.nickname.includes(searchText));
        const admin = totalList.filter((v: any) => v.role.name === 'admin' && v.nickname.includes(searchText));
        const publisher = totalList.filter((v: any) => v.role.name === 'publisher'&& v.nickname.includes(searchText));
        const user = totalList.filter((v: any) => v.role.name === 'user' && v.nickname.includes(searchText));
        setUserGroup({
            owner,
            admin,
            publisher,
            user
        })
    }

    const ItemGroup = (props: any) => {
        const { type, list } = props;
        const title = type === 'owner' ? t('placeholder.RoomOwner') : type === 'admin' ? t('placeholder.RoomManager') : type === 'publisher' ? t('placeholder.Participant') :  t('placeholder.Viewers');

        return (
            <>
                <div style={{ color: 'rgb(240, 240, 240)', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }} >
                    {title}（{list.length}）
                </div>
                <div>
                    <Space direction="vertical">
                        {
                            list.map((v,index) => <ViewerItem key={index} item={v} current={currentUser} room_name={roomInfo.name} />)
                        }
                    </Space>
                </div>
            </>
        )
    }
    return (
        <div style={{ padding: '0 20px', color: 'rgb(240, 240, 240)' }}>
            <Input
                id="viewer-list-search"
                size="large"
                style={{
                    border: 'none',
                    color: 'rgb(240, 240, 240)',
                    marginBottom: 20,
                }}
                prefix={<SearchOutlined onClick={search} style={{ color: 'rgb(240, 240, 240)', cursor: 'pointer' }} />}
                placeholder="Search"
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={search}
            />
            <div style={{ overflowY: 'scroll', height: 'calc(100vh - 210px)' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    {
                        userGroup.owner.length > 0 && <ItemGroup type="owner" list={userGroup.owner} />
                    }
                    {
                        userGroup.admin.length > 0 && <ItemGroup type="admin" list={userGroup.admin} />
                    }
                    {
                        userGroup.publisher.length > 0 && <ItemGroup type="publisher" list={userGroup.publisher} />
                    }
                    {
                        userGroup.user.length > 0 && <ItemGroup type="user" list={userGroup.user} />
                    }
                </Space>
            </div>
            <div style={{ padding: '20px 0' }}>
                <Button 
                    type="primary" 
                    block
                    loading={!room.name && !new URLSearchParams(window.location?.hash?.split('?')[1] || '')?.get('roomName')}
                    onClick={() => {
                        // 优先使用room.name (LiveKit的房间名称)，如果不存在则从URL参数获取
                        const roomName = room.name || new URLSearchParams(window.location?.hash?.split('?')[1] || '')?.get('roomName') || '';
                        if (roomName) {
                            copy(`${window.location.origin}/#/live/watch?roomName=${roomName}`)
                            message.success(t('toast.copySuccess'));
                        } else {
                            // 房间还在初始化中，给用户友好的提示
                            message.warning({
                                content: t('placeholder.roomInitializing'),
                                duration: 3
                            });
                        }
                    }}
                >
                    {room.name || new URLSearchParams(window.location?.hash?.split('?')[1] || '')?.get('roomName') 
                        ? t('placeholder.InviteParticipant') 
                        : t('placeholder.roomInitializing')
                    }
                </Button>
            </div>
        </div>
    )
};

export default ViewerList;