
## 开发环境

在开始开发之前，请确保您的系统已安装以下软件：

- **操作系统**：Windows 10 或更高版本、macOS 10.15 或更高版本
- **Node.js**：版本 ≥ 16.x（[手动安装](https://nodejs.org/dist/latest-v20.x/) 或使用 [nvm](https://github.com/nvm-sh/nvm) 进行版本管理）
- **npm**：版本 ≥ 6.x（随 Node.js 一起安装）
- **Git**：用于代码版本控制


## 运行环境

本应用支持以下浏览器和操作系统版本：

| 浏览器/操作系统 | 版本              | 状态 |
| --------------- | ----------------- | ---- |
| **Chrome**      | 78 及以上         | ✅   |
| **Windows**     | Windows 10 及以上 | ✅   |
| **macOS**       | 10.15 及以上      | ✅   |
| **Linux**       | 18.04 及以上      | ✅   |

### 说明

- **Chrome**：推荐使用最新版本以获得最佳体验。
- **操作系统**：确保您的系统版本符合要求，以避免兼容性问题。

## 快速开始

按照以下步骤设置本地开发环境：

1. 拉取代码



2. 安装依赖

   ```bash
   npm install
   ```

3. 修改配置

   - `.env`

     > 如果没有修改过服务端默认端口，则只需要修改`VITE_BASE_HOST`为您的服务器 ip 即可，如需配置域名和 https 访问，采用最下方的配置项，并修改`VITE_BASE_DOMAIN`为您的域名。

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

4. 运行 `npm run dev` 来启动开发服务器。访问 [http://localhost:5173](http://localhost:5173) 查看结果。默认情况下将同时启动 Electron 应用程序。

5. 开始开发测试！ 🎉

## 音视频通话

支持一对一音视频通话，并且需要先部署并配置[服务端]

### 注意

- 如果要在 web 端进行音视频通话，只能在本地（localhost）进行调试，或者部署到 https 站点上后使用，这是因为浏览器的安全策略限制。

## 构建 🚀

> 该项目允许分别构建 Web 应用程序和 Electron 应用程序，但在构建过程中会有一些差异。

### Web 应用程序

1. 运行以下命令来构建 Web 应用程序：
   ```bash
   npm run build
   ```
2. 构建结果将位于 `dist` 目录。

### Electron 应用程序

1. 使用 `package_electron.json` 替换 `package.json` 文件的内容，只保留 Electron 运行所需的依赖项，这将显著减小包的大小。同时，修改打包脚本。

2. 在对应系统下运行以下命令之一来构建 Electron 应用程序：

   > 如果需要交叉编译，仅支持在 mac 环境下打包其他系统安装包，windows 或 linux 下仅支持打包对应系统安装包。

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

3. 构建结果将位于 `release` 目录下。

## 功能列表

### 说明

| 功能模块           | 功能项                                                    | 状态 |
| ------------------ | --------------------------------------------------------- | ---- |
| **账号功能**       | 手机号注册\邮箱注册\验证码登录                            | ✅   |
|                    | 个人信息查看\修改                                         | ✅   |
|                    | 多语言设置                                                | ✅   |
|                    | 修改密码\忘记密码                                         | ✅   |
| **好友功能**       | 查找\申请\搜索\添加\删除好友                              | ✅   |
|                    | 同意\拒绝好友申请                                         | ✅   |
|                    | 好友备注                                                  | ✅   |
|                    | 是否允许添加好友                                          | ✅   |
|                    | 好友列表\好友资料实时同步                                 | ✅   |
| **黑名单功能**     | 限制消息                                                  | ✅   |
|                    | 黑名单列表实时同步                                        | ✅   |
|                    | 添加\移出黑名单                                           | ✅   |
| **群组功能**       | 创建\解散群组                                             | ✅   |
|                    | 申请加群\邀请加群\退出群组\移除群成员                     | ✅   |
|                    | 群名/群头像更改/群资料变更通知和实时同步                  | ✅   |
|                    | 群成员邀请进群                                            | ✅   |
|                    | 群主转让                                                  | ✅   |
|                    | 群主、管理员同意进群申请                                  | ✅   |
|                    | 搜索群成员                                                | ✅   |
| **消息功能**       | 离线消息                                                  | ✅   |
|                    | 漫游消息                                                  | ✅   |
|                    | 多端消息                                                  | ✅   |
|                    | 历史消息                                                  | ✅   |
|                    | 消息删除                                                  | ✅   |
|                    | 消息清空                                                  | ✅   |
|                    | 消息复制                                                  | ✅   |
|                    | 单聊正在输入                                              | ✅   |
|                    | 新消息勿扰                                                | ✅   |
|                    | 清空聊天记录                                              | ✅   |
|                    | 新成员查看群聊历史消息                                    | ✅   |
|                    | 新消息提示                                                | ✅   |
|                    | 文本消息                                                  | ✅   |
|                    | 图片消息                                                  | ✅   |
|                    | 视频消息                                                  | ✅   |
|                    | 表情消息                                                  | ✅   |
|                    | 文件消息                                                  | ✅   |
|                    | 语音消息                                                  | ✅   |
|                    | 名片消息                                                  | ✅   |
|                    | 地理位置消息                                              | ✅   |
|                    | 自定义消息                                                | ✅   |
| **会话功能**       | 置顶会话                                                  | ✅   |
|                    | 会话已读                                                  | ✅   |
|                    | 会话免打扰                                                | ✅   |
| **REST API**       | 认证管理                                                  | ✅   |
|                    | 用户管理                                                  | ✅   |
|                    | 关系链管理                                                | ✅   |
|                    | 群组管理                                                  | ✅   |
|                    | 会话管理                                                  | ✅   |
|                    | 消息管理                                                  | ✅   |
| **Webhook**        | 群组回调                                                  | ✅   |
|                    | 消息回调                                                  | ✅   |
|                    | 推送回调                                                  | ✅   |
|                    | 关系链回调                                                | ✅   |
|                    | 用户回调                                                  | ✅   |
| **容量和性能**     | 1 万好友                                                  | ✅   |
|                    | 10 万人大群                                               | ✅   |
|                    | 秒级同步                                                  | ✅   |
|                    | 集群部署                                                  | ✅   |
|                    | 互踢策略                                                  | ✅   |
| **在线状态**       | 所有平台不互踢                                            | ✅   |
|                    | 每个平台各只能登录一个设备                                | ✅   |
|                    | PC 端、移动端、Pad 端、Web 端、小程序端各只能登录一个设备 | ✅   |
|                    | PC 端不互踢，其他平台总计一个设备                         | ✅   |
| **音视频通话**     | 一对一音视频通话                                          | ✅   |
| **文件类对象存储** | 支持私有化部署 minio                                      | ✅   |
|                    | 支持 COS、OSS、Kodo、S3 公有云                            | ✅   |
| **推送**           | 消息在线实时推送                                          | ✅   |
|                    | 消息离线推送，支持个推，Firebase                          | ✅   |



## 常见问题

1. 发布 web 端时，wasm 加载太慢如何解决？

   答：针对 wasm 文件采用 gzip 压缩，压缩后会大大减小体积。同时可以做 cdn 加速，加快加载速度。

2. CKEditorError: ckeditor-duplicated-modules

答：依赖冲突，执行`npm dedupe`整理依赖



## Cloudflare Pages 部署

要将项目部署到 Cloudflare Pages，您有两种方式：

### 方式一：登录后部署（适合个人开发者）

1. 确保已经登录到 Cloudflare 账户
   ```bash
   npx wrangler login
   ```

2. 使用部署命令一键构建并部署
   ```bash
   npm run deploy
   ```

### 方式二：无需登录部署（适合团队协作）

1. 配置 Cloudflare API Token（详细步骤见 [cloudflare.md](./cloudflare.md)）

2. 设置环境变量
   ```bash
   # Linux/macOS
   export CLOUDFLARE_API_TOKEN=your_api_token_here
   export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   
   # Windows
   set CLOUDFLARE_API_TOKEN=your_api_token_here
   set CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   ```

3. 执行部署命令
   ```bash
   npm run deploy
   ```

部署完成后，Cloudflare 会提供一个 `*.pages.dev` 的 URL 供访问。
