# Security

GenCode runs shells, reads/writes files, and talks to AI providers — so security bugs matter. If you find one, please tell us before posting it publicly.

## Reporting

Email bjlida@qq.com. Include:

| 项目 / Item | 说明 / Description |
|---|---|
| 问题描述 / Description | What the issue is and what it lets an attacker do |
| 复现步骤 / Reproduction | Steps to reproduce (a small PoC is great) |
| 环境信息 / Environment | Version, OS, arch |

We'll get back to you within a few days. Once it's fixed, we'll credit you in the release notes — unless you'd rather stay anonymous.

Please **don't** open a public GitHub issue for security reports.

## Supported versions

Until `1.0.0`, only the latest minor gets security fixes. Right now that's `0.7.x`. 

## What's in scope

- The Rust backend in `src-tauri/` (PTY, FS, IPC, plugins)
- The frontend in `src/` — anywhere untrusted input lands (terminal output, file content, AI tool results, credentials)
- Release artifacts on GitHub
- The auto-updater

## What's not

- Bugs in upstream deps (Tauri, xterm.js, CodeMirror, AI SDKs…) — report those upstream. We'll ship the fix once it's released.
- Anything that needs an already-compromised machine or a local attacker with shell access
- Older versions (`< 0.5`)

## What we do to keep things safe

| 措施 / Measure | 说明 / Description |
|---|---|
| API 密钥 / API Keys | OS keychain via `keyring` — 不落盘、不入 localStorage、不入日志 / Not on disk, not in localStorage, not in logs |
| 无遥测 / No telemetry | 仅在你主动操作时联网（AI 请求、更新检查、Web 预览）/ Only talks to network when you ask it to |
| AI 工具审批 / AI Tool Approval | 文件写入和 shell 命令需用户确认后执行 / File writes and shell commands need your OK |
| 渲染器无 Node / No Node in renderer | 前端仅通过白名单 Tauri 命令访问主机 / Frontend only reaches host through allow-listed Tauri commands |
| 签名发布 / Signed releases | 更新包验证签名后安装 / Updates verified before applied |

## What we can't promise

| 限制 / Limitation | 说明 / Description |
|---|---|
| Shell 权限 | GenCode 按你的权限运行你（或 agent）指定的命令 — 这是终端的本质 / Runs whatever you (or the agent) tell it to run, with your permissions — that's the point of a terminal |
| AI 数据 | AI 服务商能看到你发送的内容 — 请阅读其数据保留政策 / AI providers see whatever you send them — read their retention policies |
| 本地模型 / Local LLM | 本地端点视为可信 — 仅将 GenCode 指向你控制的服务器 / Local endpoints trusted at network level — only point GenCode at servers you control |
