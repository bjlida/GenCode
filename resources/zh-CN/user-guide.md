# GenCode 功能指南（简体中文）

**GenCode / 灵码ADE** 是一款 AI 原生终端与轻量开发工作空间。本文档对应 **v0.8.0** 产品功能说明。

---

## 1. 产品概览

GenCode 将以下能力整合在同一窗口：

- **原生 PTY 终端**（zsh、bash、PowerShell、fish、cmd）
- **集成代码编辑器**（CodeMirror 6）
- **文件资源管理器**与 **Git 源码管理**
- **右侧 AI 助手**（工具审批、多模型 BYOK）
- **Claude Code** 集成（安装、终端、MCP、扩展技能）

设计取向：终端优先、核心约 7–8 MB、自带 API 密钥（BYOK）、密钥仅存 OS 密钥链、无遥测。

---

## 2. 首次使用

1. 从 [GitHub Releases](https://github.com/bjlida/GenCode/releases) 安装（Windows NSIS 或便携 zip、macOS DMG、Linux deb/AppImage/rpm）。
2. **首次启动**时资源管理器为空，请点击 **打开项目文件夹** 选择仓库。
3. **再次启动**会自动恢复上次打开的项目目录。
4. 配置 AI：**设置 → 模型**（`Ctrl+,`），选择服务商并填写 API Key。
5. 可选：**设置 → Claude Code** 安装内嵌 Node.js 与 Claude Code CLI（国内镜像自动切换）。

---

## 3. 界面布局

Cursor 风格 **三栏** 工作区：

| 区域 | 内容 |
|---|---|
| **左侧** | 文件资源管理器或源码管理（`Ctrl+B` 切换侧边栏） |
| **中间** | 标签页：终端、编辑器、预览、Markdown、差异、Git 历史等 |
| **右侧** | AI 助手面板（`Ctrl+I`，宽度 320–480px 可拖拽并记忆） |

**顶栏**：品牌图标、标签页、搜索、拆分、设置。

**状态栏右下角**（请区分两个入口）：

| 控件 | 作用 |
|---|---|
| **CC 图标** | **新建 Claude 终端** — 新开标签页并执行 `claude`（未安装则跳转设置） |
| **打开 AI 助手** + `Ctrl+I` | 开关 **右侧 AI 面板**（不是 Claude Code） |
| Agent 状态胶囊 | Agent 运行中时点击可跳到 AI 面板 |

两个 AI 相关入口 **相互独立**，请勿混淆。

---

## 4. 终端

- **WebGL** 渲染，多标签；切换标签时 PTY 保持后台输出
- **分屏**：顶栏网格菜单 — 向右拆分 / 向下拆分（快捷键见设置）
- **搜索**：终端标签激活时可用顶栏搜索
- **Shell 集成**：cwd 跟踪（OSC 7）、提示符边界（OSC 133）
- **隐私终端标签**：AI 不可读缓冲区（状态栏显示隐私模式徽标）
- **WSL** 工作区环境（状态栏工作区选择器）
- 各 Shell 首次显示 GenCode 品牌欢迎信息

**提示**

- 程序向 PTY 写入换行请使用 `\r`（CR）
- 若布局变化后终端只剩光标，请 **新建终端标签**（v0.8.0 已修复 WebGL 重绘）

---

## 5. AI 助手

通过 **`Ctrl+I`** 或状态栏 **「打开 AI 助手」** 打开。

### 5.1 模型

支持 OpenAI、Anthropic、Google、xAI、Cerebras、Groq、DeepSeek、Mistral、OpenRouter、通义千问、智谱、Moonshot、OpenAI 兼容接口，以及本地 **LM Studio / MLX / Ollama**。

在 **设置 → 模型** 配置；密钥不落盘（OS 密钥链）。

### 5.2 Composer 输入区

- 多行输入，**Enter** 发送（具体绑定见设置）
- **附件** 菜单：附加文件、粘贴剪贴板截图、**截取屏幕**（需支持视觉的模型）
- **语音输入**（在设置中配置后可用）
- 需审批的工具调用会在对话流中显示 **审批卡片**

### 5.3 Agent 与技能

- **设置 → Agent**：15 个内置预设、自定义 Agent、**快捷片段 (Snippets)**、自定义指令模板
- 聊天内 **斜杠命令**
- **计划模式** 与差异审阅
- **子代理**（探索、审查、安全等）
- 工作区 `GENCODE.md` 项目记忆

### 5.4 选区提问

编辑器中选中文本后按 **`Ctrl+L`**，右侧出现「向灵码ADE 提问」入口。

### 5.5 由 AI 工具启动的 Claude

Agent 使用托管 Agent 工具时，可自动 **新建终端标签** 并带 prompt 运行 `claude`（与状态栏 CC 按钮行为不同）。

---

## 6. Claude Code

### 6.1 状态栏启动

点击状态栏 **CC 图标**，会 **始终新建** 名为 `claude` 的终端标签并运行 CLI。未安装时跳转 **设置 → Claude Code**。

### 6.2 手动使用

安装后在普通终端标签中执行 `claude`。GenCode 会尽量写入 **中文 locale**（`language: chinese`、`zh_CN.UTF-8`）到 `~/.claude/settings.json`。

### 6.3 设置 → Claude Code

- 安装 / 升级 Node.js 与 Claude Code CLI
- **MCP 服务器** 管理（写入 `~/.gencode/claude-config/.mcp.json`）
- 版本检测与一键升级

### 6.4 设置 → Claude 技能

从 GitHub / GitLab / Gitee 搜索并安装扩展技能。

### 6.5 命令参考

**`Ctrl+Shift+?`** 打开中文命令参考面板（60+ 条 Claude Code 命令）。

### 6.6 通知

通知铃铛可展示 Agent / Claude Code 事件；可按提示 **启用 Claude Code 通知**。

---

## 7. 编辑器

- 多语言：TS/JS、Rust、Python、Go、C/C++/Java/C#、PHP、HTML/CSS、JSON、Markdown 等
- **Markdown**：工具栏切换 **预览** / **Markdown**（预览同步未保存内容）
- **AI 行内补全**（需配置）
- **AI 差异标签页**：逐块接受/拒绝 Agent 修改
- **查找替换**：`Ctrl+H`
- **格式化**：`Ctrl+Shift+Alt+F` 或右键 **格式化代码**（Rust 用 `cargo fmt`；其他语言在可用时用 Prettier；会先保存）
- **右键菜单**：撤销、重做、剪切、复制、粘贴、格式化
- Vim 模式、自动换行、状态栏行列号
- 关闭未保存文件：保存 / 不保存 / 取消

---

## 8. 资源管理器与 Git

### 资源管理器

- Catppuccin 图标、模糊搜索 `Ctrl+Shift+F`
- 内联重命名、右键菜单（打开、在资源管理器中显示、复制路径、附加到 AI 等）
- 支持文件的剪切/复制/粘贴（视平台而定）

### 源码管理

- 暂存、取消暂存、提交（`Ctrl+Enter` / `Cmd+Enter`）、推送
- 与 **资源管理器项目根** 对齐（请打开含 `.git` 的文件夹）
- 单文件差异标签、带提交图谱的 Git 历史

---

## 9. 设置（`Ctrl+,`）

主窗口 **内嵌 overlay**（日常使用不再依赖独立设置窗口）。标签页：

| 标签 | 说明 |
|---|---|
| 通用 | 外观、缩放、编辑器、终端、启动 |
| 主题 | 应用/编辑器主题、背景图 |
| 快捷键 | 键位；`Ctrl+K` 快速查阅 |
| 模型 | API Key 与默认模型 |
| Agent | 预设、自定义 Agent、片段、自定义指令 |
| Claude Code | 运行时安装、MCP |
| Claude 技能 | 远程扩展技能 |
| 关于 | 版本、检查更新、链接 |

---

## 10. 安全与隐私

- AI 工具 **沙箱预设**（宽松 / 标准 / 严格），策略文件位于 `~/.gencode/`
- **隐私终端**：输出不进入 AI 上下文
- Rust 后端出站 HTTP 具备 **SSRF 防护**
- Agent 工具路径拒绝列表与 Shell 校验
- **无遥测**、无账号体系

漏洞报告见 [SECURITY.md](../../SECURITY.md)。

---

## 11. 常用快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+I` | 开关右侧 AI 助手面板 |
| `Ctrl+L` | 向 AI 提问选中内容 |
| `Ctrl+,` | 打开设置 |
| `Ctrl+Shift+?` | Claude Code 命令参考 |
| `Ctrl+B` | 切换侧边栏 |
| `Ctrl+T` | 新建终端标签 |
| `Ctrl+D` / `Ctrl+Shift+D` | 终端向右 / 向下拆分 |
| `Ctrl+H` | 查找与替换 |
| `Ctrl+Shift+Alt+F` | 格式化当前文件 |
| `Ctrl+K` | 快捷键搜索 |

完整列表：**设置 → 快捷键**。

---

## 12. v0.8.0 更新摘要

- Cursor 风格 **三栏** + 右侧 AI 面板
- **内嵌设置** overlay；Agent 页（片段 + 自定义指令）
- 状态栏 **CC 图标** 与 **打开 AI 助手** 分离
- Composer **附件**（文件、粘贴截图、截屏）
- Markdown **预览/源码** 切换
- 首次启动资源管理器为空；**记住上次项目**
- Git 与 Explorer 项目根对齐修复
- 终端 **WebGL** 与 **cwd 重挂载** 修复
- Windows CI 发布 **NSIS** + 便携 zip；自定义安装界面

---

## 13. 获取帮助

- [GitHub Issues](https://github.com/bjlida/GenCode/issues)
- [Releases](https://github.com/bjlida/GenCode/releases) 下载与更新
- English: [User guide (EN)](../en/user-guide.md)
