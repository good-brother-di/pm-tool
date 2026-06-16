@echo off
chcp 65001 >nul
title PM Tool - 项目管理

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo.
echo ============================================
echo   PM Tool - 项目管理软件
echo ============================================
echo.

:: Find Node.js
set "NODE_DIR="
if exist "..\nodejs\node.exe" (set "NODE_DIR=..\nodejs") else if exist "nodejs\node.exe" (set "NODE_DIR=nodejs")

if "%NODE_DIR%"=="" (
    echo 错误: 未找到 Node.js
    pause
    exit /b 1
)

set "NPM=%NODE_DIR%\npm.cmd"
set "NPX=%NODE_DIR%\npx.cmd"

:: ===== 首次运行初始化 =====
if not exist "node_modules" (
    echo [1/3] 安装依赖 (约3-5分钟，请保持网络连接)...
    call "%NPM%" install --production
    if %errorlevel% neq 0 (
        echo 重试中...
        call "%NPM%" install --production
    )
    echo 依赖安装完成！
    echo.
)

:: Initialize database if needed
if not exist "prisma\pm-tool.db" (
    if exist "prisma\migrations" (
        echo [2/3] 初始化数据库...
        call "%NPX%" prisma db push --skip-generate
        echo 数据库初始化完成！
        echo.
    )
)

:: Build if needed
if not exist ".next" (
    echo [3/3] 构建项目 (约1-2分钟)...
    call "%NPM%" run build
    echo 构建完成！
    echo.
)

:: ===== 启动 =====
echo 启动服务...
start "PM-Tool-Server" /MIN "%NPM%" run start

echo 等待就绪...
set /a count=0
:wait
timeout /t 1 /nobreak >nul
set /a count+=1
powershell -Command "try { $r = Invoke-WebRequest http://localhost:3000 -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto ready
if %count% lss 30 goto wait
echo 启动超时
pause
exit /b 1

:ready
start http://localhost:3000
echo 浏览器已打开: http://localhost:3000
echo 关闭此窗口将停止服务。
pause
