#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 启动小小学习台..."
# TTS 代理
if ! curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8766/?text=hi&lang=en" | grep -q 200; then
  python3 ./tts_proxy.py &
  echo "  ✓ 自然语音服务 :8766"
  sleep 1
else
  echo "  ✓ 自然语音服务已在运行"
fi
# 静态页
if ! curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8765/" | grep -q 200; then
  python3 -m http.server 8765 --bind 0.0.0.0 &
  echo "  ✓ 网页服务 :8765"
  sleep 1
else
  echo "  ✓ 网页服务已在运行"
fi
echo ""
echo "打开浏览器访问： http://127.0.0.1:8765/"
echo "语音引擎：Edge 神经语音（中文活泼女声 / 英文童声）"
wait
