# 小小冒险家学习台 (kids-learning-workbench)

儿童 K12 以下学习 Web 应用：涂鸦墙入口、语文（写字+古诗）、数学（加减+乘法表）、英语、地理、天文、观察类游戏。

## 本地运行

```bash
# 方式一：直接打开
open index.html

# 方式二：带语音代理
python3 server.py
# 浏览器访问 http://127.0.0.1:8765
```

## 功能概览

- 涂鸦墙热区导航（点书本/数字/宇航员/长城等）
- 语文：笔顺写字 + 古诗朗读
- 数学：AI 加减出题 + 乘法表
- 英语 / 地理 / 天文：每日小知识，可连续翻阅
- 游戏：数字连线、颜色规律、小迷宫
- 手写笔支持（Pointer Events + Hanzi Writer）
- AI 讲解与判分（可在设置中开关）

## 目录

- `index.html` / `css/` / `js/` — 前端
- `assets/doodle-wall.jpg` — 涂鸦墙海报
- `server.py` — 静态服务 + TTS 代理（可选）
