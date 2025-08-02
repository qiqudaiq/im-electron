import React, { useState, useEffect } from 'react';
import { Card, Text, Flex, Button, TextField, Badge, Avatar } from "@radix-ui/themes";
import { Pagination, Input, Empty, Spin, message } from 'antd';
import { SearchOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { t } from "i18next";
import { UNSAFE_NavigationContext } from "react-router-dom";
import { getLiveStreamList } from "@/api/imApi";

// 直播间数据类型
interface LiveRoom {
  id: string;
  roomName: string;
  nickname:string;
  hostName: string;
  hostAvatar: string;
  viewerCount: number;
  isLive: boolean;
  coverImage?: string;
  description?: string;
  tags?: string[];
  startTime: string;
}



interface LiveStreamListProps {
  className?: string;
}

const LiveStreamList: React.FC<LiveStreamListProps> = ({ className }) => {
  const { navigator } = React.useContext(UNSAFE_NavigationContext);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(6);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [total, setTotal] = useState(0);

  // 获取直播间列表数据
  const fetchLiveRooms = async () => {
    try {
      setLoading(true);
      const response = await getLiveStreamList({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        keyword: searchKeyword || undefined,
      });
              
        // 根据实际 API 返回的数据结构调整映射
        const mappedRooms: LiveRoom[] = (response.data?.data || []).map((item: any) => ({
          id: item.id || Math.random().toString(),
          roomName: item.room_name || '',
          nickname:  item.nickname || t('placeholder.unknownLiveRoom'),
          hostName: item.user?.nickname || item.nickname || t('placeholder.unknownHost'),
          hostAvatar: item.user?.face_url || '',
          viewerCount: item.total_users || item.max_online_users || 0,
          isLive: item.status === 'start',
          coverImage: item.cover || '',
          description: item.detail || '',
          tags: [], // API 中没有提供 tags，设为空数组
          startTime: item.start_time || item.created_at || new Date().toISOString(),
        }));
        
        setLiveRooms(mappedRooms);
        setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('获取直播间列表失败:', error);
      message.error(t('placeholder.getLiveRoomsListFailed'));
      setLiveRooms([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 页面变化或搜索关键词变化时重新获取数据
  useEffect(() => {
    fetchLiveRooms();
  }, [currentPage, searchKeyword]);

  // 搜索时重置到第一页
  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    setCurrentPage(1);
  };

  // 进入直播间
  const handleJoinRoom = (room: LiveRoom) => {
    if (room.isLive) {
      navigator.push(`/live/watch?roomName=${room.roomName}&roomId=${room.id}`);
    }
  };

  // 渲染直播间卡片
  const renderRoomCard = (room: LiveRoom) => (
    <Card 
      key={room.id} 
      className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
      onClick={() => handleJoinRoom(room)}
    >
      {/* 直播状态标识 */}
      {room.isLive && (
        <div className="absolute top-2 left-2 z-10">
          <Badge color="red" variant="solid" className="animate-pulse">
            LIVE
          </Badge>
        </div>
      )}

      {/* 观看人数 */}
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-black/50 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
          <EyeOutlined />
          <span>{room.viewerCount}</span>
        </div>
      </div>

      {/* 封面图片区域 */}
      <div className="h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        {room.coverImage ? (
          <img 
            src={room.coverImage} 
            alt={room.nickname}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white text-4xl">📺</div>
        )}
      </div>

      {/* 房间信息 */}
      <div className="p-4">
        <Flex direction="column" gap="2">
          {/* 房间名称 */}
          <Text size="4" weight="bold" className="truncate">
            {room.nickname}
          </Text>

          {/* 主播信息 */}
          <Flex align="center" gap="2">
            <Avatar size="1" fallback={<UserOutlined />} />
            <Text size="2" color="gray">{room.hostName}</Text>
          </Flex>

          {/* 描述 */}
          {room.description && (
            <Text size="2" color="gray" className="line-clamp-2 h-10">
              {room.description}
            </Text>
          )}

          {/* 标签 */}
          {room.tags && room.tags.length > 0 && (
            <Flex gap="1" wrap="wrap">
              {room.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="soft" size="1">
                  {tag}
                </Badge>
              ))}
            </Flex>
          )}

          {/* 状态和操作 */}
          <Flex justify="between" align="center" className="mt-2">
                      <Text size="1" color="gray">
            {room.isLive ? t('placeholder.livestreaming') : t('placeholder.expectedStartAt', { time: room.startTime.split(' ')[1] })}
          </Text>
          <Button 
            size="1" 
            variant={room.isLive ? "solid" : "soft"}
            disabled={!room.isLive}
            onClick={(e) => {
              e.stopPropagation();
              handleJoinRoom(room);
            }}
          >
            {room.isLive ? t('placeholder.enter') : t('placeholder.book')}
          </Button>
          </Flex>
        </Flex>
      </div>
    </Card>
  );

  return (
    <div className={`w-full max-w-6xl mx-auto ${className || ''}`}>
      {/* 标题和搜索 */}
      <Flex direction="column" gap="4" className="mb-6">
     
        {/* 搜索框 */}
        <div className="w-full ">
          <Input
            size="large"
            placeholder={t('placeholder.SearchLiveRooms') || '搜索直播间、主播或标签...'}
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-white/90 w-full border-none rounded-lg"
          />
        </div>
      </Flex>

      {/* 直播间列表 */}
      <Spin spinning={loading} >
        {liveRooms.length > 0 ? (
          <div className='scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-300 max-h-[600px] min-w-[1180px] overflow-y-auto'>
            {/* 网格布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {liveRooms.map(renderRoomCard)}
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <Flex justify="end" className="mt-8">
                                <Pagination
                  current={currentPage}
                  total={total}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                  className="p-2 rounded-lg"
                  style={{
                    color: 'white'
                  }}
                  itemRender={(page, type, originalElement) => {
                    if (type === 'prev') {
                      return <span style={{ color: 'white',fontSize:30 }}>‹</span>;
                    }
                    if (type === 'next') {
                      return <span style={{ color: 'white',fontSize:30 }}>›</span>;
                    }
                    if (type === 'page') {
                      return (
                        <span 
                          style={{ 
                            color: page === currentPage ? 'black' : 'white',
                            backgroundColor: page === currentPage ? 'white' : 'transparent',
                            border: '1px solid white',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          {page}
                        </span>
                      );
                    }
                    return originalElement;
                  }}
                />
              </Flex>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <Empty 
              description={
                searchKeyword 
                  ? t('placeholder.noLiveRoomsFound', { keyword: searchKeyword })
                  : t('placeholder.noLiveRooms')
              }
              className="text-white"
            />
          </div>
        )}
      </Spin>
    </div>
  );
};

export default LiveStreamList; 