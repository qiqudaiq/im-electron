# ================================
# 构建阶段 - 编译前端代码
# ================================
FROM node:22.15.0-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制整个项目（包括本地的 node_modules）
COPY . .

# 确保 node_modules 存在
RUN if [ ! -d "node_modules" ]; then \
        echo "❌ 错误：未找到 node_modules 目录，请先在本地运行 npm install"; \
        exit 1; \
    fi

# 验证关键依赖
RUN ls -la node_modules/@openim/ || echo "⚠️ @openim 依赖未找到，但继续构建"

# 构建生产版本
RUN npm run build:prod

# ================================
# 生产阶段 - nginx服务器
# ================================
FROM nginx:alpine

# 复制构建产物到nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露80端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]