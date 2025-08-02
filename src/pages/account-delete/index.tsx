import React from 'react';
import { Card, Typography, Space, Alert } from 'antd';
import { MailOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import './index.css';

const { Title, Paragraph, Text } = Typography;

export const AccountDelete: React.FC = () => {
  return (
    <Card className="account-delete-card">
      <Space direction="vertical" size="large" className="account-delete-space">
        <Title level={3}>Account Deletion & Data Removal</Title>
        
        <Alert
          message="Important Notice"
          description="After account deletion, all your personal data will be permanently removed and cannot be recovered."
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
        />

        <Paragraph>
          You can request to delete your account and associated data through the following method:
        </Paragraph>

        <Paragraph>
          <Space>
            <MailOutlined />
            <Text>Send an email to:</Text>
            <Text strong>app@freechat.com</Text>
          </Space>
        </Paragraph>

        <Paragraph type="secondary">
          Please include "Account Deletion" in the email subject line and provide your registered phone number/email in the body.
        </Paragraph>

        <Alert
          message="Data Deletion Information"
          description="After deletion, we will remove all your personal information, chat history, contacts, and other data. This process may take 1-3 business days to complete."
          type="info"
        />
      </Space>
    </Card>
  );
};

