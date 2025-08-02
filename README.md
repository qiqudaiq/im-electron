## Development Environment

Before starting development, please ensure your system has the following software installed:

- **Operating System**: Windows 10 or higher, macOS 10.15 or higher
- **Node.js**: Version ≥ 16.x ([Manual Installation](https://nodejs.org/dist/latest-v20.x/) or use [nvm](https://github.com/nvm-sh/nvm) for version management)
- **npm**: Version ≥ 6.x (installed with Node.js)
- **Git**: For code version control

## Runtime Environment

This application supports the following browsers and operating system versions:

| Browser/OS | Version | Status |
| --------------- | ----------------- | ---- |
| **Chrome** | 78 and above | ✅ |
| **Windows** | Windows 10 and above | ✅ |
| **macOS** | 10.15 and above | ✅ |
| **Linux** | 18.04 and above | ✅ |

### Notes

- **Chrome**: Recommended to use the latest version for the best experience.
- **Operating System**: Ensure your system version meets the requirements to avoid compatibility issues.

## Quick Start

Follow these steps to set up your local development environment:

1. Clone the code

2. Install dependencies

   ```bash
   npm install
   ```

3. Modify configuration

   - `.env`

     > If you haven't modified the server's default port, you only need to change `VITE_BASE_HOST` to your server IP. For domain name and HTTPS access configuration, use the configuration items at the bottom and modify `VITE_BASE_DOMAIN` to your domain name.

     ```bash
     VITE_BASE_HOST=your-server-ip

     VITE_WS_URL=ws://$VITE_BASE_HOST:10001
     VITE_API_URL=http://$VITE_BASE_HOST:10002
     VITE_CHAT_URL=http://$VITE_BASE_HOST:10008

     # VITE_BASE_DOMAIN=your-server-domain

     # VITE_WS_URL=wss://$VITE_BASE_DOMAIN/msg_gateway
     # VITE_API_URL=https://$VITE_BASE_DOMAIN/api
     # VITE_CHAT_URL=https://$VITE_BASE_DOMAIN/chat
     ```

4. Run `npm run dev` to start the development server. Visit [http://localhost:5173](http://localhost:5173) to see the results. By default, the Electron application will also start.

5. Start development and testing! 🎉

## Audio/Video Calls

Supports one-to-one audio/video calls, and requires [server-side] deployment and configuration first.

### Note

- For web-based audio/video calls, you can only debug locally (localhost) or use it after deploying to an HTTPS site, due to browser security policy restrictions.

## Build 🚀

> This project allows building Web applications and Electron applications separately, but there are some differences in the build process.

### Web Application

1. Run the following command to build the Web application:
   ```bash
   npm run build
   ```
2. The build results will be in the `dist` directory.

### Electron Application

1. Replace the contents of `package.json` with `package_electron.json`, keeping only the dependencies required for Electron operation, which will significantly reduce package size. Also, modify the packaging script.

2. Run one of the following commands on the corresponding system to build the Electron application:

   > For cross-compilation, only macOS environment supports packaging installation packages for other systems. Windows or Linux only supports packaging installation packages for their respective systems.

   - macOS:
     ```bash
     npm run build:mac
     ```
   - Windows:
     ```bash
     npm run build:win
     ```
   - Linux:
     ```bash
     npm run build:linux
     ```

3. The build results will be in the `release` directory.

## Feature List

### Description

| Feature Module | Feature Items | Status |
| ------------------ | --------------------------------------------------------- | ---- |
| **Account Features** | Phone Registration\Email Registration\Verification Code Login | ✅ |
| | View\Modify Personal Information | ✅ |
| | Multi-language Settings | ✅ |
| | Change Password\Forgot Password | ✅ |
| **Friend Features** | Find\Apply\Search\Add\Delete Friends | ✅ |
| | Accept\Reject Friend Requests | ✅ |
| | Friend Remarks | ✅ |
| | Allow Friend Requests | ✅ |
| | Friend List\Friend Profile Real-time Sync | ✅ |
| **Blacklist Features** | Message Restrictions | ✅ |
| | Blacklist Real-time Sync | ✅ |
| | Add\Remove from Blacklist | ✅ |
| **Group Features** | Create\Dismiss Groups | ✅ |
| | Apply to Join\Invite to Join\Leave Group\Remove Group Members | ✅ |
| | Group Name/Avatar Change/Group Profile Change Notification and Real-time Sync | ✅ |
| | Group Member Invitations | ✅ |
| | Group Owner Transfer | ✅ |
| | Group Owner, Admin Approve Join Requests | ✅ |
| | Search Group Members | ✅ |
| **Message Features** | Offline Messages | ✅ |
| | Roaming Messages | ✅ |
| | Multi-device Messages | ✅ |
| | Message History | ✅ |
| | Message Deletion | ✅ |
| | Message Clear | ✅ |
| | Message Copy | ✅ |
| | Single Chat Typing Status | ✅ |
| | New Message Do Not Disturb | ✅ |
| | Clear Chat History | ✅ |
| | New Members View Group Chat History | ✅ |
| | New Message Notifications | ✅ |
| | Text Messages | ✅ |
| | Image Messages | ✅ |
| | Video Messages | ✅ |
| | Emoji Messages | ✅ |
| | File Messages | ✅ |
| | Voice Messages | ✅ |
| | Business Card Messages | ✅ |
| | Location Messages | ✅ |
| | Custom Messages | ✅ |
| **Conversation Features** | Pin Conversations | ✅ |
| | Conversation Read Status | ✅ |
| | Conversation Do Not Disturb | ✅ |
| **REST API** | Authentication Management | ✅ |
| | User Management | ✅ |
| | Relationship Chain Management | ✅ |
| | Group Management | ✅ |
| | Conversation Management | ✅ |
| | Message Management | ✅ |
| **Webhook** | Group Callbacks | ✅ |
| | Message Callbacks | ✅ |
| | Push Callbacks | ✅ |
| | Relationship Chain Callbacks | ✅ |
| | User Callbacks | ✅ |
| **Capacity and Performance** | 10,000 Friends | ✅ |
| | 100,000 Member Groups | ✅ |
| | Second-level Sync | ✅ |
| | Cluster Deployment | ✅ |
| | Mutual Kick Policy | ✅ |
| **Online Status** | All Platforms No Mutual Kick | ✅ |
| | One Device Per Platform | ✅ |
| | One Device Each for PC, Mobile, Pad, Web, Mini Program | ✅ |
| | PC No Mutual Kick, One Device for Other Platforms | ✅ |
| **Audio/Video Calls** | One-to-one Audio/Video Calls | ✅ |
| **File Object Storage** | Support Private Minio Deployment | ✅ |
| | Support COS, OSS, Kodo, S3 Public Cloud | ✅ |
| **Push** | Real-time Online Message Push | ✅ |
| | Offline Message Push, Support Getui, Firebase | ✅ |

## FAQ

1. How to solve slow wasm loading when publishing web version?

   Answer: Use gzip compression for wasm files, which will significantly reduce size. You can also use CDN acceleration to speed up loading.

2. CKEditorError: ckeditor-duplicated-modules

   Answer: Dependency conflict, execute `npm dedupe` to organize dependencies

