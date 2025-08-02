# build.ps1

<#
.SYNOPSIS
    FREECHAT H5前端 Windows 构建脚本 (已移除 git pull)

.DESCRIPTION
    此脚本用于在 Windows 平台上构建 FREECHAT H5前端的 Docker 镜像，并将其推送到仓库。
    它将使用本地当前目录的代码进行构建。
    最终生成的镜像是基于 Linux 的，可以在任何 Linux 服务器上运行。

.PARAMETER Version
    必须提供的镜像版本号，例如 'v1.0.0' 或 'latest'。

.EXAMPLE
    .\build.ps1 -Version v0.5.1
    .\build.ps1 -Version latest
#>

# --- 参数定义 (必须是脚本的第一个可执行语句) ---
param(
    [Parameter(Mandatory=$true, HelpMessage="必须指定版本号, 例如 'v1.0.0'")]
    [string]$Version
)

# ✅ 已修复：将此行移动到 param() 块之后
Set-StrictMode -Version Latest

# --- 配置 ---
$ORG = "freechatim"
$REPO = "freechat-web-front"
$FULL_NAME = "$ORG/${REPO}:${Version}"

# --- 辅助函数：执行命令并检查结果 ---
function Invoke-CommandAndCheck {
    param(
        [string]$Command,
        [string[]]$Arguments,
        [string]$SuccessMessage,
        [string]$ErrorMessage,
        [bool]$ExitOnError = $true
    )
    
    # 将命令和参数数组连接成一个字符串，仅用于显示
    $displayCommand = "$Command $($Arguments -join ' ')"
    Write-Host "🔄 开始执行: $displayCommand"

    & $Command $Arguments

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $SuccessMessage" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $ErrorMessage" -ForegroundColor Red
        if ($ExitOnError) {
            # 使用 exit 1 来停止整个脚本
            exit 1
        }
        return $false
    }
}

# --- 主逻辑开始 ---
Write-Host "🚀 开始构建 FREECHAT H5前端镜像..." -ForegroundColor Cyan
Write-Host "📦 镜像名称: $FULL_NAME" -ForegroundColor Cyan
Write-Host ""

# 1. 拉取最新代码 (已按要求移除此步骤)
# Write-Host "Git pull step has been removed." -ForegroundColor Gray

# 2. 检查并安装依赖
Write-Host "📦 检查并安装依赖..." -ForegroundColor Yellow
if (-not (Test-Path -Path ".\node_modules" -PathType Container)) {
    Write-Host "📥 未找到 node_modules，开始安装依赖..."
    Invoke-CommandAndCheck "npm" @("install", "--legacy-peer-deps") "依赖安装成功" "依赖安装失败"
} else {
    Write-Host "📋 node_modules 已存在，尝试快速更新..."
    $ciSuccess = Invoke-CommandAndCheck "npm" @("ci", "--legacy-peer-deps") "依赖快速更新成功" "依赖更新失败，将使用现有依赖继续构建" -ExitOnError $false
}

Write-Host ""

# 3. 检查关键依赖文件
Write-Host "🔧 检查关键依赖文件..." -ForegroundColor Yellow
$wasmLibPath = ".\node_modules\@openim\wasm-client-sdk\lib\index.es.js"
if (-not (Test-Path -Path $wasmLibPath -PathType Leaf)) {
    Write-Host "⚠️ 警告：关键依赖文件 $wasmLibPath 不存在，构建可能会失败。" -ForegroundColor Yellow
} else {
    Write-Host "✅ 关键依赖文件存在。" -ForegroundColor Green
}

Write-Host ""

# 4. 构建镜像
Write-Host "🔨 构建镜像: $FULL_NAME" -ForegroundColor Yellow
Invoke-CommandAndCheck "docker" @("build", "-t", $FULL_NAME, ".") "镜像构建成功" "镜像构建失败"

Write-Host ""

# 5. 推送镜像
Write-Host "📤 推送镜像: $FULL_NAME" -ForegroundColor Yellow
Invoke-CommandAndCheck "docker" @("push", $FULL_NAME) "镜像推送成功" "镜像推送失败"

Write-Host ""
Write-Host "🎉 构建完成！" -ForegroundColor Magenta
Write-Host "📋 镜像信息:"
Write-Host "   组织: $ORG"
Write-Host "   仓库: $REPO"
Write-Host "   版本: $Version"
Write-Host "   完整名称: $FULL_NAME"
Write-Host ""
Write-Host "🐳 拉取命令: docker pull $FULL_NAME"
Write-Host "🚀 运行命令: docker run -p 8080:80 $FULL_NAME"