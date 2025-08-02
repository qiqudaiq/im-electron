# Cloudflare Pages部署指南

## 无需登录部署的配置方法

您可以通过配置Cloudflare API Token来实现无需每次登录就能部署项目，这样团队中的所有成员都可以进行部署而无需共享Cloudflare账号。

### 步骤1: 获取Cloudflare API Token和账户ID

1. 登录到Cloudflare控制面板 (https://dash.cloudflare.com/)
2. 在右上角点击个人资料图标，然后选择"我的个人资料"
3. 在左侧导航栏中选择"API Tokens"
4. 点击"创建Token"
5. 选择"创建自定义Token"
6. 给Token命名，例如"Pages Deployment"
7. 在权限部分，添加以下权限：
   - Account > Cloudflare Pages > Edit
   - Account > Account Settings > Read
8. 在账户资源部分，选择您的账户
9. 创建Token，并保存生成的Token值
10. 在Cloudflare控制台首页右侧可以找到您的账户ID

### 步骤2: 配置项目以使用API Token

有两种方式可以配置API Token:

#### 方法1: 使用环境变量（推荐用于CI/CD）

在CI/CD环境或本地终端中设置以下环境变量:

```bash
export CLOUDFLARE_API_TOKEN=your_api_token_here
export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

Windows系统使用:

```bat
set CLOUDFLARE_API_TOKEN=your_api_token_here
set CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

#### 方法2: 创建.env文件（本地开发）

在项目根目录创建`.env`文件（确保添加到.gitignore中）:

```
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

### 步骤3: 修改wrangler.toml

打开`wrangler.toml`文件，取消注释并设置账户ID:

```toml
# Cloudflare账户信息配置
account_id = "your-account-id"  # 替换为您的Cloudflare账户ID
```

### 步骤4: 部署

现在任何拥有API Token的人都可以直接运行部署命令而无需登录:

```bash
npm run deploy
```

### 安全注意事项

- 不要将API Token提交到代码仓库
- 在CI/CD系统中使用加密的环境变量
- 给予Token最小必要权限
- 定期轮换Token以增强安全性 