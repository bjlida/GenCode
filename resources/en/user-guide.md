# GenCode User Guide (English)

**GenCode / 灵码ADE** is an AI-native terminal and lightweight development workspace. This guide describes product features as of **v0.8.0**.

---

## 1. Overview

GenCode combines:

- A **native PTY terminal** (zsh, bash, PowerShell, fish, cmd)
- An **integrated code editor** (CodeMirror 6)
- **File explorer** and **Git** source control
- A **right-side AI assistant** with tool approval and multi-model support
- **Claude Code** integration (install, terminal, MCP, extension skills)

Design goals: terminal-first workflow, ~7–8 MB binary, BYOK (bring your own API keys), keys in the OS keychain, no telemetry.

---

## 2. First launch

1. Install from [GitHub Releases](https://github.com/bjlida/GenCode/releases) (Windows NSIS or portable zip, macOS DMG, Linux deb/AppImage/rpm).
2. On first start the **file explorer is empty** — click **Open project folder** and choose your repo.
3. On later launches GenCode **restores the last opened project**.
4. Configure AI: **Settings → Models** (`Ctrl+,`) — pick a provider and paste an API key.
5. Optional: **Settings → Claude Code** — install embedded Node.js + Claude Code CLI (mirrors auto-fallback in China).

---

## 3. Workspace layout

Cursor-style **three-pane** layout:

| Area | Contents |
|---|---|
| **Left** | File explorer or Source Control (`Ctrl+B` toggles sidebar) |
| **Center** | Tabs: terminal, editor, preview, Markdown, diffs, Git history |
| **Right** | AI assistant panel (`Ctrl+I`, draggable width 320–480px, persisted) |

**Header**: logo, tabs, search, split menu, settings.

**Status bar** (bottom right, important):

| Control | Action |
|---|---|
| **CC icon** | **New Claude terminal** — opens a new tab and runs `claude` (or Settings if not installed) |
| **Open AI assistant** + `Ctrl+I` | Opens/closes the **right AI panel** (not Claude Code) |
| Agent status pill | Jumps to AI panel when an agent run is active |

These two AI entry points are **intentionally separate**.

---

## 4. Terminal

- **WebGL** rendering, multiple tabs, panes stay alive when hidden
- **Split**: header grid menu — split right / split down (or shortcuts in Settings)
- **Search** in active terminal tab (header search when terminal focused)
- **Shell integration**: cwd tracking (OSC 7), prompt boundaries (OSC 133)
- **Private tab**: AI cannot read buffer context (incognito badge on status bar)
- **WSL** as a workspace environment (workspace selector on status bar)
- Brand welcome banner once per shell session

**Tips**

- Use `\r` (CR) for Enter in programmatic PTY writes
- If you only see a cursor after layout changes, open a **new terminal tab** (WebGL repaint fix in v0.8.0)

---

## 5. AI assistant

Open with **`Ctrl+I`** or status bar **Open AI assistant**.

### 5.1 Models

BYOK providers include OpenAI, Anthropic, Google, xAI, Cerebras, Groq, DeepSeek, Mistral, OpenRouter, Qwen, Zhipu, Moonshot, OpenAI-compatible endpoints, and local **LM Studio / MLX / Ollama**.

Configure under **Settings → Models**. Keys never touch disk (OS keychain).

### 5.2 Composer

- Multi-line input, send with **Enter** (see Settings for binding)
- **Attachments** menu: attach files, paste screenshot from clipboard, **capture screen** (needs a vision-capable model)
- **Voice input** when configured (Settings → General / voice section)
- Tool calls that need approval show an **approval card** in the chat stream

### 5.3 Agents and skills

- **Settings → Agent**: 15 built-in presets, custom agents, **snippets**, custom instruction templates
- Slash commands in chat (see in-app list)
- **Plan mode** and diff review for proposed edits
- **Sub-agents** for explore, review, security, etc.
- Project memory via `GENCODE.md` in the workspace

### 5.4 Selection ask

In the editor, select text and press **`Ctrl+L`** — a pill appears to send the selection to the AI panel.

### 5.5 Managed Claude from AI tools

When the AI agent uses a managed-agent tool, GenCode can spawn a **dedicated terminal tab** running `claude` with your prompt (separate from the status bar CC button).

---

## 6. Claude Code

### 6.1 Status bar launcher

Click the **CC icon** on the status bar to **always create a new terminal tab** named `claude` and run the `claude` CLI. If Claude Code is not installed, you are sent to **Settings → Claude Code**.

### 6.2 Manual use

In any normal terminal tab, run `claude` after installation. GenCode applies **Chinese locale** (`language: chinese`, `zh_CN.UTF-8`) via `~/.claude/settings.json` when possible.

### 6.3 Settings → Claude Code

- Install / update Node.js and Claude Code CLI (mirror fallback)
- **MCP servers** CRUD (writes `~/.gencode/claude-config/.mcp.json`)
- Version check and one-click upgrade

### 6.4 Settings → Claude skills

Search and install extension skills from GitHub / GitLab / Gitee.

### 6.5 Command reference

**`Ctrl+Shift+?`** opens a Chinese command palette (60+ Claude Code commands).

### 6.6 Notifications

Notification bell can surface Claude Code / agent events; enable Claude notifications from the bell menu when offered.

---

## 7. Editor

- Languages: TypeScript/JavaScript, Rust, Python, Go, C/C++/Java/C#, PHP, HTML/CSS, JSON, Markdown, and more
- **Markdown**: toggle **Preview** / **Markdown** in the toolbar (live preview respects unsaved edits)
- **AI inline autocomplete** (when configured)
- **AI diff tabs**: accept/reject hunks from agent edits
- **Find/replace**: `Ctrl+H`
- **Format document**: `Ctrl+Shift+Alt+F` or context menu **Format code** (Rust: `cargo fmt`; others: Prettier when available; saves first)
- **Context menu**: undo, redo, cut, copy, paste, format
- Vim mode, word wrap, line/column on status bar
- Unsaved close: Save / Don't save / Cancel

---

## 8. File explorer and Git

### Explorer

- Catppuccin file icons, fuzzy search `Ctrl+Shift+F`
- Inline rename, context menu (open, reveal, copy path, attach to AI, etc.)
- Clipboard cut/copy/paste for files where supported

### Source control

- Stage, unstage, commit (`Ctrl+Enter` / `Cmd+Enter`), push
- Aligned with **explorer project root** (open a folder containing `.git`)
- Per-file diff tabs, Git history with commit graph

---

## 9. Settings (`Ctrl+,`)

In-app **overlay** (not a separate window). Sections:

| Tab | Purpose |
|---|---|
| General | Appearance, zoom, editor, terminal, startup |
| Themes | App and editor themes, background image |
| Shortcuts | Keybindings; `Ctrl+K` quick reference |
| Models | API keys and default models |
| Agent | Presets, custom agents, snippets, instructions |
| Claude Code | Runtime install, MCP |
| Claude skills | Extension skills from remotes |
| About | Version, updates, links |

---

## 10. Security and privacy

- **Sandbox presets** (permissive / standard / strict) for AI file and shell tools — editable policy file under `~/.gencode/`
- **Private terminal tabs**: output excluded from AI context
- **SSRF protection** on outbound AI HTTP from the Rust backend
- Path deny lists and shell validation on the agent tool surface
- **No telemetry**, no account system

See [SECURITY.md](../../SECURITY.md) to report issues.

---

## 11. Shortcuts (common)

| Shortcut | Action |
|---|---|
| `Ctrl+I` | Toggle right AI assistant panel |
| `Ctrl+L` | Ask AI about editor selection |
| `Ctrl+,` | Settings overlay |
| `Ctrl+Shift+?` | Claude Code command reference |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+T` | New terminal tab |
| `Ctrl+D` / `Ctrl+Shift+D` | Split terminal right / down |
| `Ctrl+H` | Find and replace |
| `Ctrl+Shift+Alt+F` | Format current file |
| `Ctrl+K` | Shortcut search |

Full list: **Settings → Shortcuts**.

---

## 12. v0.8.0 highlights

- Cursor-style **three-pane** UI with right AI panel
- **In-app settings** overlay; Agent page with snippets and custom instructions
- Status bar **CC icon** vs **Open AI assistant** split
- Composer **attachments** (file, clipboard screenshot, screen capture)
- Markdown **preview/source** toggle
- Explorer empty first run; **last project** restore
- Git panel fix when project root matches explorer
- Terminal **WebGL** and **cwd re-attach** fixes
- Windows **NSIS** + portable zip in CI; custom installer artwork

---

## 13. Getting help

- [GitHub Issues](https://github.com/bjlida/GenCode/issues)
- [Releases](https://github.com/bjlida/GenCode/releases) for installers and updates
- 简体中文: [功能指南](../zh-CN/user-guide.md)
