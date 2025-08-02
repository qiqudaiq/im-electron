import React from "react";
import { Typography, Space, Divider } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Paragraph, Text, Link } = Typography;

// Style to force scrolling and override parent container constraints
const forceScrollStyle = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto' as const,
  overflowX: 'hidden' as const,
  height: 'auto'
} as React.CSSProperties;

export const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <div style={forceScrollStyle} className="bg-white">
      <div className="max-w-4xl mx-auto p-6 sm:p-8 pb-16">
        <Title className="text-2xl sm:text-4xl text-center text-indigo-700">
          Privacy Policy
        </Title>
        <Paragraph className="text-right text-gray-500">
          Last updated: {new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})}
        </Paragraph>

        <Divider />

        <section className="mb-8">
          <Title level={2}>Introduction</Title>
          <Paragraph>
            We at FreeChat highly value your privacy. This Privacy Policy explains how FreeChat collects, uses, and discloses your information when you use our service.
          </Paragraph>
        </section>

        <section className="mb-8">
          <Title level={2}>Information We Collect</Title>
          <Paragraph>
            Our application may collect the following information:
          </Paragraph>
          
          <Title level={3} className="mt-4">Camera and Microphone</Title>
          <Paragraph>
            We request access to your camera and microphone so you can take photos, record videos, and audio messages to share with other users.
          </Paragraph>
          
          <Title level={3} className="mt-4">Location Information</Title>
          <Paragraph>
            We may collect your location information to provide location-based features, such as chatting with nearby users or sharing your location.
          </Paragraph>
          
          <Title level={3} className="mt-4">Storage</Title>
          <Paragraph>
            We need storage permissions to save and access media files.
          </Paragraph>
          
          <Title level={3} className="mt-4">Device Information</Title>
          <Paragraph>
            We may collect device information, such as device model, operating system version, etc., to optimize application performance.
          </Paragraph>
        </section>
        
        <section className="mb-8">
          <Title level={2}>How We Use the Information Collected</Title>
          <Paragraph>
            We use the collected information to:
          </Paragraph>
          <ul className="list-disc pl-8 mt-2">
            <li className="mb-1">Provide, maintain, and improve our services</li>
            <li className="mb-1">Develop new features and services</li>
            <li className="mb-1">Protect user and application security</li>
            <li className="mb-1">Analyze application usage and trends</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <Title level={2}>Information Sharing and Disclosure</Title>
          <Paragraph>
            We do not sell your personal information. We may share information in the following situations:
          </Paragraph>
          <ul className="list-disc pl-8 mt-2">
            <li className="mb-1">With your consent</li>
            <li className="mb-1">With service providers</li>
            <li className="mb-1">When required by law</li>
            <li className="mb-1">To protect our rights and safety</li>
          </ul>
        </section>
        
        <section className="mb-8">
          <Title level={2}>Data Security</Title>
          <Paragraph>
            We have implemented appropriate technical and organizational measures to protect your personal information.
          </Paragraph>
        </section>
        
        <section className="mb-8">
          <Title level={2}>Your Choices and Rights</Title>
          <Paragraph>
            You can access, correct, delete your personal information, and limit how we use your information through application settings or by contacting us.
          </Paragraph>
        </section>
        
        <section className="mb-8">
          <Title level={2}>Changes to This Privacy Policy</Title>
          <Paragraph>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes through the application.
          </Paragraph>
        </section>
        
        <section className="mb-8">
          <Title level={2}>Child Sexual Abuse and Exploitation (CSAE) Prevention Standards</Title>
          <Paragraph>
            We are committed to protecting children from sexual abuse and exploitation. We strictly adhere to the following CSAE prevention standards:
          </Paragraph>
          <ul className="list-disc pl-8 mt-2">
            <li className="mb-1">Prohibition of any form of child sexual abuse and exploitation content</li>
            <li className="mb-1">Strict review of user-uploaded content</li>
            <li className="mb-1">Immediate removal of violating content and reporting to relevant law enforcement authorities</li>
            <li className="mb-1">Regular CSAE prevention training for employees</li>
          </ul>
          <Paragraph className="mt-4">
            If you discover any content that may involve child sexual abuse or exploitation, please report it immediately through the following channels:
          </Paragraph>
          <Paragraph>
            <Text strong>Report Email:</Text> report@freechat.com
          </Paragraph>
      
        </section>

        <section className="mb-8">
          <Title level={2}>Contact Us</Title>
          <Paragraph>
            If you have any questions or concerns, please contact us at:
          </Paragraph>
          <Paragraph>
            <Text strong>Email:</Text> app@freechat.com
          </Paragraph>
        
        </section>

        <Divider />
        
        <footer className="text-center text-gray-500 mt-8">
          <p>© {currentYear} FreeChat · Next-Generation AI Messaging Platform</p>
         
        </footer>
      </div>
    </div>
  );
};