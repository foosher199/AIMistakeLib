#!/bin/bash

echo "🔄 Restarting development server on port 4001..."

# 查找并关闭占用 3001 端口的进程
echo "🛑 Stopping services on port 4001..."
lsof -ti:4001 | xargs kill -9 2>/dev/null || echo "   No process found on port 4001"

# 等待端口释放
sleep 2

# 启动开发服务器
echo "🚀 Starting development server..."
npm run dev
