#!/bin/bash

# FREECHAT H5前端 构建脚本
# 使用方法: sh build.sh v0.5.1

# 配置
ORG="freechatim"
REPO="freechat-web-front"

# 获取版本号参数
VERSION=$1

# 检查版本号是否提供
if [ -z "$VERSION" ]; then
    echo "❌ 错误：必须指定版本号"
    echo ""
    echo "使用方法："
    echo "  sh build.sh v1.0.0"
    echo "  sh build.sh v2.1.0"
    echo "  sh build.sh latest"
    echo ""
    echo "示例："
    echo "  sh build.sh v0.5.1"
    exit 1
fi

# 完整镜像名
FULL_NAME="$ORG/$REPO:$VERSION"

echo "🚀 开始构建 FREECHAT H5前端镜像..."
echo "📦 镜像名称: $FULL_NAME"
echo ""

echo "🔄 拉取最新代码..."
if git pull; then
    echo "✅ 代码更新成功"
else
    echo "❌ 代码更新失败"
    exit 1
fi

echo ""

echo "📦 检查并安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "📥 未找到 node_modules，开始安装依赖..."
    if npm install --legacy-peer-deps; then
        echo "✅ 依赖安装成功"
    else
        echo "❌ 依赖安装失败"
        exit 1
    fi
else
    echo "📋 node_modules 已存在，检查是否需要更新..."
    if npm ci --legacy-peer-deps; then
        echo "✅ 依赖更新成功"
    else
        echo "⚠️  依赖更新失败，使用现有依赖继续构建"
    fi
fi

echo ""
echo "🔧 强制重新安装关键依赖..."
echo "🔄 每次构建都重新安装 @openim/wasm-client-sdk..."
if [ ! -f "node_modules/@openim/wasm-client-sdk/lib/index.es.js" ]; then
    echo "❌ 安装后仍然缺失 lib 文件，构建可能失败"
else
    echo "✅ @openim/wasm-client-sdk 重新安装成功"
fi

echo ""

echo "🔨 构建镜像: $FULL_NAME"
if docker build -t $FULL_NAME .; then
    echo "✅ 镜像构建成功"
else
    echo "❌ 镜像构建失败"
    exit 1
fi

echo ""
echo "📤 推送镜像: $FULL_NAME"
if docker push $FULL_NAME; then
    echo "✅ 镜像推送成功"
else
    echo "❌ 镜像推送失败"
    exit 1
fi

echo ""
echo "🎉 构建完成！"
echo "📋 镜像信息:"
echo "   组织: $ORG"
echo "   仓库: $REPO"
echo "   版本: $VERSION"
echo "   完整名称: $FULL_NAME"
echo ""
echo "🐳 拉取命令: docker pull $FULL_NAME"
echo "🚀 运行命令: docker run -p 8080:80 $FULL_NAME" 