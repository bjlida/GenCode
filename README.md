<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="GenCode" />
  <h1>GenCode/灵码ADE</h1>

  <p><strong>AI 原生终端 + 轻量开发工作空间 — 全中文、开箱即用、无外部依赖</strong></p>

  <p>
    <img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="license" />
    <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey" alt="platform" />
    <img src="https://img.shields.io/badge/bundle-~8MB-blue" alt="bundle size" />
  </p>
</div>

---

## 关于本项目

GenCode (灵码ADE) 是一款 **AI 原生终端模拟器 (ADE — Agentic Development Environment)**，定位 terminal-first 的 AI 编程终端，区别于 VS Code 等重 IDE，聚焦终端交互 + AI 辅助编码一体化体验。全中文界面，开箱即用。核心二进制约 7-8 MB，无遥测，无账户系统。

- **技术栈**: Tauri 2 + Rust (`portable-pty`) + React 19 + TypeScript + xterm.js (WebGL) + CodeMirror 6 + Vercel AI SDK v6 + Tailwind v4
- **许可证**: [Apache License 2.0](LICENSE)

## 核心特性

### 终端
- xterm.js WebGL 渲染，多标签页后台流式传输
- 原生 PTY 后端 (zsh / bash / pwsh / fish / cmd)
- 分屏面板 (水平和垂直)
- 内联搜索、链接检测、真彩色
- Windows WSL 一等支持
- 终端启动时显示 GenCode/灵码ADE 品牌标识

### AI 助手
- **BYOK 多模型**: OpenAI / Anthropic / Google / xAI / Cerebras / Groq / DeepSeek / Mistral / OpenRouter / 通义千问 / 文心一言 / 讯飞星火 / 智谱 GLM / Moonshot + OpenAI-compatible 自定义接口
- **本地模型**: LM Studio / MLX / Ollama
- **Agent 工作流**: 计划模式、子代理、项目记忆 (GENCODE.md)、工具审批门控
- **15 内置预设代理**: 编码 / 架构 / 审查 / 安全 / 设计 / 测试 / 调试 / 重构 / 文档 / 性能 / 运维 / 构建 / 数据库 / API开发 / CLI工具
- **全中文界面**: 所有 UI 文案、工具描述、错误提示、安全策略均已汉化

### 内嵌 Claude Code
- 一键安装 Node.js + Claude Code CLI (国内镜像自动切换)
- 托管 PTY 会话中运行完整 Claude Code Agent
- MCP 服务器可视化管理
- Skills 搜索与安装 (GitHub / GitLab / Gitee)
- 60+ 命令中文参考面板
- 版本自动检测与一键升级

### 代码编辑器
- CodeMirror 6 (TS/JS, Rust, Python, Go, C/C++, Java, HTML/CSS, JSON, Markdown 等)
- AI 行内自动补全
- AI 编辑差异对比，逐块接受/拒绝
- Vim 模式
- 10 种内置编辑器主题

### 源码控制
- 暂存/取消暂存、提交 (Cmd+Enter / Ctrl+Enter)、推送
- Git 历史面板含真实提交图谱 (分支/合并泳道渲染)
- 提交搜索与过滤

### 文件管理器
- Catppuccin 图标主题
- 模糊搜索、键盘导航、内联重命名
- 文件/选中内容直接附加到 AI 面板

### 安全
- **沙箱策略引擎**: 3 档预设 (宽松/标准/严格)，可自定义路径/命令/网络/进程门控
- 密钥存储于 OS 原生 keychain，不落盘
- SSRF 防护 (DNS 重绑定防御)
- 路径拒绝列表 + 命令注入检测 + 双向覆盖字符防护
- 原子文件写入 (temp + rename)

### 主题与定制
- 内置主题与自定义主题编辑器
- 背景图片 (可调节透明度和模糊)
- 编辑器主题独立于应用主题

## 安装

### Windows
- 下载 `.msi` 或 `.exe` 安装包
- 首次启动如提示 "Windows protected your PC"，点击 **更多信息** → **仍要运行**
- 默认 Shell: `pwsh.exe` → `powershell.exe` → `cmd.exe`

### macOS
- 下载 `.dmg`，拖入 Applications
- 最低系统版本: macOS 13.0
- 如提示"无法验证开发者"，右键（或按住 Ctrl 点击）图标 → **打开**，点击"打开"即可运行。无签名的开源应用属于正常情况。

### Linux
- **Arch / AUR**: `yay -S gencode-bin`
- **deb**: `sudo dpkg -i GenCode_*.deb`
- **rpm**: `sudo rpm -i GenCode_*.rpm`
- **AppImage**: `chmod +x GenCode_*.AppImage && ./GenCode_*.AppImage`

## 配置 AI

1. 打开 **设置 → 模型**
2. 选择服务商并粘贴 API Key
3. 国内用户可在 **设置 → Claude Code** 安装内嵌运行时
4. 密钥存储于 OS keychain，永不落盘

## 环境配置

GenCode 是桌面应用，生产环境**无需**配置环境变量。以下是开发时可选的环境变量：

| 变量 | 用途 | 说明 |
|---|---|---|
| `TAURI_DEV_HOST` | 开发服务器监听地址 | 设 `0.0.0.0` 开放局域网访问 Vite dev server |
| `RUST_LOG` | Rust 后端日志级别 | `gencode_lib=debug` 或 `trace` 用于调试 |

AI API 密钥采用 BYOK（自带密钥）模式，在软件 **设置 → 模型** 中配置，存储在 OS 原生密钥链中，不落盘。

复制模板文件即可使用:

```bash
cp .env.example .env
```

## CI / CD 流水线

项目使用 GitHub Actions 实现持续集成与自动发布。

### CI (`.github/workflows/ci.yml`)

在 PR 和推送到 `main` 分支时触发：

| Job | 平台 | 检查项 |
|---|---|---|
| `frontend` | Linux | TypeScript 类型检查、Vitest 测试、前端构建 |
| `rust` | Linux | `cargo check`、`cargo clippy`、`cargo test` |
| `rust-platforms` | Windows + macOS | `cargo check` 跨平台编译验证 |

### 发布流水线 (`.github/workflows/release.yml`)

打 `v*` tag 时触发，自动构建安装包并创建 GitHub Release：

| 平台 | 架构 | 产物 |
|---|---|---|
| macOS | Apple Silicon (aarch64) + Intel (x86_64) | `.dmg` |
| Linux | x86_64 | `.deb`、`.AppImage`、`.rpm` |
| Windows | x86_64 | `.msi`、`.exe` (NSIS) |

发布为草稿 (draft)，确认无误后在 GitHub 手动发布。

### 所需 Secrets

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置：

| Secret | 用途 |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | 更新包签名私钥（`pnpm tauri sign --generate` 生成） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 签名私钥密码 |

### 触发发布

```bash
# 打 tag 并推送即可触发自动发布
git tag v0.8.0
git push origin v0.8.0
```

## 自动升级

GenCode 内置 Tauri updater 自动更新机制：

1. 发布流水线构建时自动生成 `latest.json` + `.sig` 签名文件 + `.tar.gz` 更新包
2. 应用启动时检查 `tauri.conf.json` 中 `plugins.updater.endpoints` 指向的地址
3. 发现新版本时弹出更新提示，用户确认后后台下载并安装

> 更换仓库后记得将 `tauri.conf.json` 中的 `endpoints` 地址改为你自己的 Releases 地址。

## 从源码构建

**前置条件**: Rust (stable)、Node 20+、pnpm、Tauri 平台依赖

```bash
pnpm install
pnpm tauri dev          # 开发模式
pnpm tauri build        # 生产构建
```

**代码检查**:
```bash
pnpm exec tsc --noEmit          # 前端类型检查
cd src-tauri && cargo clippy    # Rust lint
cargo test --locked             # Rust 测试
```

构建时自动下载 Node.js v22 LTS (依次尝试 nodejs.org → npmmirror.com → tuna.tsinghua.edu.cn)。

### 便携版 (免安装)

```bash
# 只编译二进制，跳过打包 (产物: src-tauri/target/release/gencode.exe)
pnpm tauri build --no-bundle
```

产物约 7-8 MB，复制到任意目录直接运行，无需安装。系统需 Windows 10+（自带 WebView2）。

## 项目结构

```
├── src/                    # React 前端
│   ├── modules/
│   │   ├── ai/             # AI 子系统
│   │   ├── claude-code/    # Claude Code 集成
│   │   ├── terminal/       # 终端
│   │   ├── editor/         # 代码编辑器
│   │   ├── explorer/       # 文件管理器
│   │   ├── settings/       # 设置面板
│   │   └── ...             # header/sidebar/statusbar/tabs/theme 等
│   └── settings/           # 设置窗口独立页面
├── src-tauri/              # Rust 后端
│   └── src/modules/
│       ├── pty/            # PTY 管理 + shell 初始化脚本
│       ├── claude_code/    # CC 运行时/MCP/Skills
│       ├── sandbox/        # 安全沙箱策略引擎
│       ├── fs/             # 文件系统操作
│       ├── git/            # Git 操作
│       ├── shell/          # Shell 执行
│       ├── net/            # AI HTTP 代理 (SSRF 防护)
│       └── ...             # secrets/workspace/agent
└── CLAUDE.md               # Claude Code 开发指导
```

## 贡献

欢迎提交 Issue 和 PR。参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源协议

GenCode 基于 [Apache License 2.0](LICENSE) 开源。

---

*GenCode/灵码ADE. Built with Tauri 2 + Rust + React 19.*
