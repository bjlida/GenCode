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

> 本项目基于 [Crynta/Terax](https://github.com/Crynta/Terax) (Apache 2.0) 二次开发。

GenCode (灵码ADE) 是一款 **AI 原生终端模拟器 (ADE — Agentic Development Environment)**，定位 terminal-first 的 AI 编程终端，区别于 VS Code 等重 IDE，聚焦终端交互 + AI 辅助编码一体化体验。全中文界面，开箱即用。核心二进制约 7-8 MB，无遥测，无账户系统。

- **技术栈**: Tauri 2 + Rust (`portable-pty`) + React 19 + TypeScript + xterm.js (WebGL) + CodeMirror 6 + Vercel AI SDK v6 + Tailwind v4
- **许可证**: [Apache License 2.0](LICENSE)
- **功能文档 / Docs**: [resources/](resources/)（[English](resources/en/user-guide.md) · [简体中文](resources/zh-CN/user-guide.md)）
- **路线图**: [ROADMAP.md](ROADMAP.md) · **开发指南**: [CLAUDE.md](CLAUDE.md) · **安全报告**: [SECURITY.md](SECURITY.md)

## 界面布局

Cursor 风格三栏工作区：

| 区域 | 内容 |
|---|---|
| **左侧** | 文件 / 源码管理（`Ctrl+B` 切换侧边栏） |
| **中间** | 终端、编辑器、预览等标签页工作区 |
| **右侧** | AI 助手面板（`Ctrl+I` 开关，可拖拽宽度 320–480px） |

顶栏为品牌图标 + 标签页 + 搜索；底栏状态栏含 **CC 图标**（新建 Claude 终端）与 **打开 AI 助手**（`Ctrl+I`）；设置为主窗口内嵌 overlay（`Ctrl+,`），不再使用独立设置窗口。

## 核心特性

### 终端
- xterm.js WebGL 渲染，多标签页后台流式传输
- 原生 PTY 后端 (zsh / bash / pwsh / fish / cmd)
- 分屏面板 (水平和垂直)
- 内联搜索、链接检测、真彩色
- Windows WSL 一等支持
- 终端启动时显示 GenCode/灵码ADE 品牌标识

### AI 助手
- **右侧 AI 面板** (`Ctrl+I`): Cursor 风格布局，聊天记录 + 工具审批 + 圆角 Composer 输入框合一，可拖拽调整宽度（320–480px，宽度持久化）
- **状态栏「打开 AI 助手」** (`Ctrl+I`): 与 CC 图标分离；仅打开右侧 AI 面板
- **Composer 附件**: 附加文件、粘贴剪贴板截图、截取屏幕（需视觉模型）
- **选区提问** (`Ctrl+L`): 编辑器选中文字后在代码区右侧显示「向灵码ADE 提问」
- **BYOK 多模型**: OpenAI / Anthropic / Google / xAI / Cerebras / Groq / DeepSeek / Mistral / OpenRouter / 通义千问 / 文心一言 / 讯飞星火 / 智谱 GLM / Moonshot + OpenAI-compatible 自定义接口
- **本地模型**: LM Studio / MLX / Ollama
- **技能工作流**: 计划模式、子代理、项目记忆 (GENCODE.md)、工具审批门控
- **15 内置预设技能**: 编码 / 架构 / 审查 / 安全 / 设计 / 测试 / 调试 / 重构 / 文档 / 性能 / 运维 / 构建 / 数据库 / API开发 / CLI工具（可在 **设置 → 技能** 切换）
- **全中文界面**: UI 文案、工具描述、错误提示、安全策略均已汉化

### 内嵌 Claude Code
- **状态栏 CC 图标**: 一键新建 Claude 终端标签并运行 `claude`（未安装时跳转设置）
- 一键安装 Node.js + Claude Code CLI (国内镜像自动切换)
- 在集成终端运行 `claude` 即可使用；GenCode 自动配置中文 locale（`language: chinese` + `zh_CN.UTF-8`）
- 托管 PTY 会话中运行完整 Claude Code（AI 工具 `spawnManagedAgent` 亦可触发）
- MCP 服务器可视化管理（**设置 → Claude Code**）
- Claude 扩展技能搜索与安装 (GitHub / GitLab / Gitee)（**设置 → Claude 技能**）
- 60+ 命令中文参考面板（`Ctrl+Shift+?`）
- 版本自动检测与一键升级

### 代码编辑器
- CodeMirror 6 (TS/JS, Rust, Python, Go, C/C++, Java, HTML/CSS, JSON, Markdown 等)
- **Markdown 预览/源码**: 打开 `.md` 文件后，编辑器右上角可切换 **预览** / **Markdown**（预览同步未保存编辑）
- AI 行内自动补全
- AI 编辑差异对比，逐块接受/拒绝
- Vim 模式、自动换行、查找替换 (`Ctrl+H`)、格式化 (`Ctrl+Shift+Alt+F`)
- **编辑器右键菜单**：撤销/重做、剪切/复制/粘贴、**格式化代码**（Rust → `cargo fmt`，其他 → Prettier；先保存再格式化）
- 状态栏行列号、关闭未保存提示（保存 / 不保存 / 取消）
- 10 种内置编辑器主题

### 设置
- **主窗口内嵌设置** (`Ctrl+,`): 左侧导航 + 实色背景 overlay，Esc 关闭；最大化窗口无空白区
- 标签页: 通用 / 主题 / 快捷键 / 模型 / Agent / Claude Code / Claude 技能 / 关于
- **Agent 页**: 15 内置预设、自定义 Agent、快捷片段 (Snippets)、自定义指令模板
- 通用页分组卡片布局（外观、缩放、编辑器、终端、启动等）

### 源码控制
- 暂存/取消暂存、提交 (Cmd+Enter / Ctrl+Enter)、推送
- Git 历史面板含真实提交图谱 (分支/合并泳道渲染)
- 提交搜索与过滤

### 文件管理器
- Catppuccin 图标主题
- **首次启动为空**，需点击「打开项目文件夹」；之后自动恢复上次打开的项目目录
- 模糊搜索 (`Ctrl+Shift+F`)、键盘导航、内联重命名
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
- Cursor 风格 UI 密度（13px 基准字号，`globals.css` `--text-chrome` 令牌）

## 近期更新摘要

| 领域 | 改进 |
|---|---|
| 布局 | Cursor 三栏：侧边栏 / 工作区 / 右侧 AI 面板；顶栏品牌 Logo 替换文字 |
| 设置 | 内嵌 overlay（含最大化修复）；Agent 页重构（片段 + 自定义指令） |
| Claude Code | 状态栏 CC 图标一键新建终端；中文 locale；与 AI 助手入口分离 |
| AI Composer | 附件菜单（文件 / 粘贴截图 / 截屏）；圆角输入框；移除空状态占位 |
| 资源管理器 | 首次启动空目录；记住上次项目路径 |
| 源码管理 | 与 Explorer 项目根对齐，修复 Git 不加载 |
| 编辑器 | Markdown 预览/源码切换；选区提问 (`Ctrl+L`)；右键菜单 **格式化代码** |
| 终端 | 修复 WebGL 重绘导致仅显示光标；OSC cwd 重挂载修复 |
| 通知 | 通知铃铛文案中文化；Claude Code 通知一键启用 |
| Windows 发布 | CI 使用 NSIS + 便携 zip；自定义安装界面 BMP |
| UI | 顶栏加高、图标放大、侧边栏字号、拆分菜单与通知 footer 布局修复 |

详情见 [ROADMAP.md](ROADMAP.md) Shipped 章节。

## 安装

### Windows
- 从 [GitHub Releases](https://github.com/bjlida/GenCode/releases) 下载 **NSIS 安装包** (`GenCode_*_x64-setup.exe`) 或 **便携 zip**
- CI 自动发布 NSIS 安装包（GitHub runner 上 WiX/MSI 不稳定，Release 不含 `.msi`；本地可 `pnpm tauri build --bundles nsis,msi` 自行打 MSI）
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
| Windows | x86_64 | `.exe` (NSIS 安装包) + portable zip |

> **Windows CI 说明**: v0.7.3 曾因 WiX `light.exe` 失败导致 Windows 产物缺失。现 CI 对 Windows 使用 `--bundles nsis`，只打 NSIS 与便携 zip，与自定义安装界面 (`installer-header.bmp` / `installer-sidebar.bmp`) 一致。

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
pnpm tauri dev          # 开发模式 (Tauri 窗口 + 前端 HMR)
pnpm dev                # 仅 Vite → http://localhost:1420
pnpm tauri build        # 生产构建
```

### 本地开发与验证

日常改 UI / 前端逻辑推荐：

```bash
# 1. 类型检查 + 单测 (与 CI frontend job 一致)
pnpm exec tsc --noEmit
pnpm test

# 2. 仅前端构建 smoke test
pnpm build

# 3. 完整桌面应用 (需 Rust 工具链)
pnpm tauri dev
```

**常用快捷键**:

| 快捷键 | 功能 |
|---|---|
| `Ctrl+I` | 开关右侧 AI 助手面板 |
| `Ctrl+L` | 向 AI 提问选中内容 |
| `Ctrl+,` | 打开设置 |
| `Ctrl+Shift+?` | Claude Code 命令参考 |
| `Ctrl+B` | 切换侧边栏 |
| `Ctrl+T` | 新建终端标签 |
| `Ctrl+H` | 查找与替换 |
| `Ctrl+Shift+Alt+F` | 格式化当前文件 |

状态栏 **CC 图标**（Claude 标志）可一键新建 Claude 终端，与 `Ctrl+I` 的 AI 助手入口独立。

完整列表见 **设置 → 快捷键** 或 `Ctrl+K`。

**手动验收清单** (大改 UI 后建议跑一遍):

| 项 | 操作 |
|---|---|
| AI 面板 | `Ctrl+I` 打开右侧面板，发送消息，拖拽宽度分隔条 |
| 设置 | Header 齿轮 → 内嵌 overlay（含最大化）；Agent / Claude Code / Claude 技能页可打开 |
| 资源管理器 | 首次启动为空；打开含 `.git` 的项目后，源码管理应显示仓库 |
| 编辑器 | 打开 `.md` 切换预览/源码；右键 **格式化代码**；`Ctrl+S` 保存，状态栏看行列号 |
| 终端 | 新标签应显示 Shell 提示符与欢迎信息（非仅光标） |
| Claude Code | 状态栏 CC 图标 → 新建 `claude` 终端；手动 `claude` 与 `Ctrl+Shift+?` 命令参考 |
| Composer | 附件菜单：附加文件、粘贴截图、截取屏幕（需视觉模型） |
| 安装界面 | 见下方「NSIS 安装界面资源」 |

**代码检查** (与 CI 对齐):
```bash
pnpm exec tsc --noEmit          # 前端类型检查
cd src-tauri && cargo clippy    # Rust lint
cargo test --locked             # Rust 测试
```

构建时自动下载 Node.js v22 LTS (依次尝试 nodejs.org → npmmirror.com → tuna.tsinghua.edu.cn)。

### NSIS 安装界面资源

Windows 安装向导头图/侧栏由脚本从 `icon.png` 生成（深色渐变 + 品牌文案）:

```bash
python scripts/generate-installer-assets.py
# 产物: src-tauri/icons/installer-header.bmp (150×57)
#       src-tauri/icons/installer-sidebar.bmp (164×314)

pnpm tauri build --bundles nsis   # 本地预览安装包
```

### 便携版 (免安装)

```bash
# 只编译二进制，跳过打包 (产物: src-tauri/target/release/gencode.exe)
pnpm tauri build --no-bundle
```

产物约 7-8 MB，复制到任意目录直接运行，无需安装。系统需 Windows 10+（自带 WebView2）。

## 项目结构

```
├── resources/              # 用户功能文档 (中/英)
│   ├── en/user-guide.md
│   └── zh-CN/user-guide.md
├── src/                    # React 前端
│   ├── modules/
│   │   ├── ai/             # AI 子系统
│   │   ├── claude-code/    # Claude Code 集成
│   │   ├── terminal/       # 终端
│   │   ├── editor/         # 代码编辑器
│   │   ├── explorer/       # 文件管理器
│   │   ├── settings/       # 设置 overlay + preferences + AgentsSection
│   │   ├── statusbar/      # 状态栏 (CC 终端 / AI 助手入口)
│   │   ├── markdown/       # Markdown 编辑器 + 预览 (MarkdownEditorPane)
│   │   └── workspace/      # 工作区路径持久化 (lastPath)
│   └── settings/           # 设置 section 组件
├── scripts/
│   └── generate-installer-assets.py  # NSIS header/sidebar BMP
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

欢迎提交 Issue 和 Pull Request。请先阅读 [ROADMAP.md](ROADMAP.md) 了解方向与范围，在 [GitHub Issues](https://github.com/bjlida/GenCode/issues) 讨论后再动手。

## 开源协议

GenCode 基于 [Apache License 2.0](LICENSE) 开源。

---

*GenCode/灵码ADE. Built with Tauri 2 + Rust + React 19.*
