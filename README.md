# 🚀 宇宙无敌表达训练系统

> **在线版（Web）**: 打开 [GitHub Pages](https://moshlwx.github.io/expression-trainer/) 即用，支持中英双语，移动端适配。
>
> **桌面版（Electron）**: 本地离线语音识别（Sherpa-ONNX），数据完全本地处理。

实时语音镜子，帮你看见自己怎么说话。实时语音识别 → 词库匹配 → AI反馈。

## 功能

- 🎤 **实时语音识别**：Web版用浏览器 Web Speech API，桌面版用 Sherpa-ONNX 离线识别
- 📝 **全屏字幕显示**：黑底大字，实时显示你说的每一句话
- 🔍 **词库分析**：自动检测填充词、犹豫词、笼统词，给出精准替代
- 🌍 **中英双语**：中文+英文双词库，一键切换
- 📱 **移动端适配**：响应式布局，手机也能用
- 🤖 **AI反馈**：支持 DeepSeek / OpenAI / Ollama / 自定义 多后端
- 📊 **AI分析报告**：11维度深度分析，可下载 Markdown
- 🎯 **自定义训练规则**：设置训练目标、风格参考、口癖词列表

---

## 在线版（Web）

**直接使用**：部署到 GitHub Pages 即可。`docs/` 目录包含完整的纯前端 Web 应用。

### 本地运行

```bash
# 用任意 HTTP 服务器打开 docs/ 目录
cd docs
python3 -m http.server 8080
# 打开 http://localhost:8080
```

### 部署到 GitHub Pages

1. Push 到 GitHub 仓库
2. Settings → Pages → Source 选择 `main` 分支的 `/docs` 目录
3. 等待部署完成

---

## 桌面版（Electron）

### 1. 克隆项目 & 安装依赖

```bash
cd expression-trainer
npm install
```

### 2. 下载语音识别模型

需要下载 Sherpa-ONNX 的 streaming paraformer 中英双语模型：

```bash
cd models
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2
tar xvf sherpa-onnx-streaming-paraformer-bilingual-zh-en.tar.bz2
```

### 3. 启动应用

```bash
npm start
```

---

## 配置 AI 后端

点击右上角 ⚙️ 进入设置。推荐：

| 后端 | 费用 | 速度 | 获取方式 |
|------|------|------|----------|
| DeepSeek | 极低 | 快 | [platform.deepseek.com](https://platform.deepseek.com) |
| OpenAI | 中等 | 快 | [platform.openai.com](https://platform.openai.com) |
| Ollama | 免费 | 取决于硬件 | [ollama.com](https://ollama.com) 本地运行 |

## 字幕颜色含义

| 颜色 | 含义 |
|------|------|
| 🔴 红色波浪下划线 | 填充词（嗯、啊、那个、然后…） |
| 🟠 橙色 | 犹豫词（可能、也许、我觉得…） |
| 🟡 黄色虚线 | 笼统词（有精准替代建议） |

## 目录结构

```
├── main.js              # Electron主进程（桌面版）
├── preload.js           # preload脚本（桌面版）
├── src/                 # Electron渲染进程（桌面版UI）
├── lib/                 # 后端模块（桌面版）
│   ├── asr.js           # Sherpa-ONNX语音识别
│   ├── lexicon.js       # 词库匹配
│   ├── ai-feedback.js   # AI反馈
│   └── prompts.js       # Prompt模板
├── data/                # 词库JSON数据
├── models/              # Sherpa-ONNX模型（需下载）
├── docs/                # Web版（GitHub Pages部署）
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── manifest.json    # PWA配置
└── package.json
```

## License

MIT

