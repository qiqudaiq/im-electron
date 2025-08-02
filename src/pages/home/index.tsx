import React from "react";
import { Button, Typography, Space, Card, Row, Col, Divider, QRCode, Menu } from "antd";
import { useNavigate } from "react-router-dom";
import { 
  MessageOutlined, 
  TeamOutlined, 
  VideoCameraOutlined, 
  UserOutlined,
  LockOutlined,
  SecurityScanOutlined,
  AppleOutlined,
  AndroidOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  WindowsOutlined
} from "@ant-design/icons";
import ReactDOM from "react-dom";
import { useEffect, useState } from "react";
import { Modal } from "antd";

const { Title, Paragraph } = Typography;

// Style to force scrolling and override parent container constraints
const forceScrollStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  WebkitOverflowScrolling: 'touch',
  height: 'auto'
};

export const Home = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /mobile|android|iphone|ipad|ipod|windows phone/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleClick = () => {
    if (isMobile) {
      Modal.info({
        title: '提示',
        content: '为了获得最佳体验，请使用桌面设备访问本应用',
        okText: '知道了',
        centered: true,
      });
      return;
    }
    navigate("/login");
  };

  return (
    <div style={forceScrollStyle} className="bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto p-4 pt-8 pb-20">
        <div className="text-center mb-8 sm:mb-12 pt-4 sm:pt-8">
          <Title level={1} className="text-3xl sm:text-4xl font-bold text-indigo-700">
            FreeChat
          </Title>
          <Paragraph className="text-base sm:text-lg text-gray-600 mt-2 sm:mt-4">
          AI驱动的即时通讯平台 · 安全 · 智能 · 可靠
          </Paragraph>
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-4 sm:gap-6">
            <Button 
              type="primary" 
              size="large"
              icon={<UserOutlined />}
              onClick={handleClick}
              className="bg-blue-600 hover:bg-blue-700  px-8 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              登录
            </Button>
            <Button 
              type="primary" 
              size="large"
              icon={<DownloadOutlined />}
              onClick={() => {
                const menu = (
                  <Menu>
                    <Menu.Item 
                      key="ios" 
                    >
                      <a
                        href={import.meta.env.VITE_DOWNLOAD_LINKS_IOS}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <AppleOutlined style={{ marginRight: 8 }} />
                        {import.meta.env.VITE_DOWNLOAD_TEXTS_IOS}
                      </a>
                    </Menu.Item>
                    <Menu.Item 
                      key="android" 
                      disabled
                    >
                      <span style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}>
                      <AndroidOutlined style={{ marginRight: 8 }}/>
                        {import.meta.env.VITE_DOWNLOAD_TEXTS_ANDROID}

                      </span>
                    </Menu.Item>
                    
                    <Menu.Item 
                      key="apk" 
                    >
                      <a
                        href={import.meta.env.VITE_DOWNLOAD_LINKS_APK}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block', width: '100%' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <DownloadOutlined style={{ marginRight: 8 }}/>
                        {import.meta.env.VITE_DOWNLOAD_TEXTS_APK}
                      </a>
                    </Menu.Item>
                  </Menu>
                );
                const button = document.querySelector('.download-button');
                if (button) {
                  const rect = button.getBoundingClientRect();
                  const x = rect.left;
                  const y = rect.bottom + 5;
                  const popup = document.createElement('div');
                  popup.style.position = 'fixed';
                  popup.style.left = `${x}px`;
                  popup.style.top = `${y}px`;
                  popup.style.zIndex = '1000';
                  document.body.appendChild(popup);
                  ReactDOM.render(menu, popup);
                  
                  const closeMenu = () => {
                    ReactDOM.unmountComponentAtNode(popup);
                    document.body.removeChild(popup);
                    document.removeEventListener('click', closeMenu);
                  };
                  
                  setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                  }, 0);
                }
              }}
              className="download-button bg-indigo-600 hover:bg-indigo-700 px-8 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            >
              下载
            </Button>
          </div>

         
        </div>

        <Divider />

        <Row gutter={[16, 16]} className="mt-8 sm:mt-12">
          <Col xs={24} sm={24} md={8}>
            <Card 
              hoverable 
              className="h-full shadow-md hover:shadow-lg transition-shadow"
              onClick={() => navigate("/chat")}
            >
              <MessageOutlined className="text-3xl sm:text-4xl text-blue-500 mb-3 sm:mb-4" />
              <Title level={4}>即时通讯</Title>
              <Paragraph className="text-gray-500">
                支持私聊、群聊、已读回执、表情包、图片、语音消息等功能
              </Paragraph>
            </Card>
          </Col>
          
          <Col xs={24} sm={24} md={8}>
            <Card 
              hoverable 
              className="h-full shadow-md hover:shadow-lg transition-shadow"
              onClick={() => navigate("/contact")}
            >
              <TeamOutlined className="text-3xl sm:text-4xl text-green-500 mb-3 sm:mb-4" />
              <Title level={4}>通讯录管理</Title>
              <Paragraph className="text-gray-500">
                通讯录、好友分组、备注、黑名单等功能
              </Paragraph>
            </Card>
          </Col>
          
          <Col xs={24} sm={24} md={8}>
            <Card 
              hoverable 
              className="h-full shadow-md hover:shadow-lg transition-shadow"
              onClick={() => navigate("/live")}
            >
              <VideoCameraOutlined className="text-3xl sm:text-4xl text-purple-500 mb-3 sm:mb-4" />
              <Title level={4}>音视频通话</Title>
              <Paragraph className="text-gray-500">
                支持一对一通话、多人视频会议，高清画质
              </Paragraph>
            </Card>
          </Col>
        </Row>

        <div className="mt-10 sm:mt-16 bg-white p-4 sm:p-8 rounded-lg shadow-md">
          <Title level={2} className="text-center mb-6 sm:mb-8">核心功能</Title>
          
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={24} md={8}>
              <Space className="mb-2">
                <LockOutlined className="text-lg sm:text-xl text-indigo-500" />
                <Title level={5} style={{margin: 0}}>端对端加密</Title>
              </Space>
              <Paragraph className="text-gray-500">
                安全的消息加密，最大程度保护隐私
              </Paragraph>
            </Col>
            
            <Col xs={24} sm={24} md={8}>
              <Space className="mb-2">
                <SecurityScanOutlined className="text-lg sm:text-xl text-indigo-500" />
                <Title level={5} style={{margin: 0}}>消息可靠性</Title>
              </Space>
              <Paragraph className="text-gray-500">
                消息确认机制，确保消息不丢失
              </Paragraph>
            </Col>
            
            <Col xs={24} sm={24} md={8}>
              <Space className="mb-2">
                <UserOutlined className="text-lg sm:text-xl text-indigo-500" />
                <Title level={5} style={{margin: 0}}>多设备同步</Title>
              </Space>
              <Paragraph className="text-gray-500">
                支持多设备登录，消息实时同步
              </Paragraph>
            </Col>
          </Row>
        </div>

        <footer className="mt-10 sm:mt-16 text-center text-gray-500 py-4 sm:py-8">
        <p>© {new Date().getFullYear()} FreeChat · 新一代AI通讯平台</p>
          
        </footer>
      </div>
    </div>
  );
};
