import { ConfigProvider, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import ViewerList from './viewer-list';
import { Chat } from './chat';
import { t } from "i18next";

const TabLabel = (props) => {
    const { title } = props;
    return (
        <div style={{ width: 120, textAlign: 'center', color: 'rgb(240,240,240)' }}>
            {title}
        </div>
    )
}
const items: TabsProps['items'] = [
    {
        key: '1',
        label: <TabLabel title={t('placeholder.Participant')} />,
        children: <ViewerList/>,
    },
    {
        key: '2',
        label: <TabLabel title={t('placeholder.ChatRoom')} />,
        children: <Chat/>,
    },
    {
        key: '3',
        label: <TabLabel title={t('placeholder.setting')} />,
        children: <div style={{ color: 'rgb(240, 240, 240)'}}>{t('placeholder.FeatureInDevelopment')}</div>,
    },
];

const onChange = (key: string) => {
};
const RightSidebar = () => {

    return (
        <div style={{ width: 424, height: '100%', backgroundColor: '#252525', }}>
            <ConfigProvider
            theme={{
                components: {
                    Tabs: {
                        itemSelectedColor: '#3e6bce',
                        itemActiveColor: '#3e6bce',
                    },
                    Input: {
                        activeBorderColor: '#252525',
                        hoverBorderColor: '#252525',
                        activeBg: '#333333',
                        colorBgContainer: '#333333',
                    }
                },
            }}
        >
            <Tabs style={{ height: '100%' }} size="large" defaultActiveKey="1" items={items} onChange={onChange} />
        </ConfigProvider>

        </div>
    )
}

export default RightSidebar