# GenCode User Guide (English)

**GenCode / 灵码ADE** is an AI-native terminal and lightweight development workspace. This guide describes product features as of **v1.0.0**.

---

## 1. Overview

GenCode combines the following in a single window:

- **Native PTY terminal** (zsh, bash, PowerShell, fish, cmd)
- **Integrated code editor** (CodeMirror 6)
- **File explorer** and **Git source control**
- **Right-side AI assistant** (tool approval, multi-model BYOK)
- **Claude Code** integration (install, terminal, MCP, extension skills)

Design goals: terminal-first, ~7–8 MB binary, BYOK (bring your own API keys), keys in the OS keychain only, no telemetry.

---

## 2. First launch

1. Install from [GitHub Releases](https://github.com/bjlida/GenCode/releases) (Windows NSIS installer or portable zip, macOS DMG, Linux deb/AppImage/rpm).
2. On **first start** the file explorer is empty — click **Open project folder** to choose a repo.
3. On **later launches** GenCode automatically restores the last opened project directory.
4. Configure AI: **Settings → Models** (`Ctrl+,`) — pick a provider and paste an API key.
5. Optional: **Settings → Claude Code** — install embedded Node.js + Claude Code CLI (mirrors auto-selected in China).

---

## 3. Workspace layout

Cursor-style **three-pane** workspace:

| Area | Contents |
|---|---|
| **Left** | File explorer or Source Control (`Ctrl+B` toggles sidebar) |
| **Center** | Tabs: terminal, editor, preview, Markdown, diffs, Git history, etc. |
| **Right** | AI assistant panel (`Ctrl+I`, draggable width 380–680px, persisted, default ~460px) |

**Header**: logo, tabs, search, split menu, settings.

**Status bar (bottom right)** — two separate AI entry points:

| Control | Action |
|---|---|
| **CC icon** | **New Claude terminal** — always opens a new tab and runs `claude` (redirects to Settings if not installed) |
| **Open AI assistant** + `Ctrl+I` | Toggles the **right AI panel** only — not Claude Code |
| Agent status pill | Visible when an agent is running; click to jump to AI panel |

These two entry points are **independent** — do not confuse them.

---

## 4. Terminal

- **WebGL** rendering, multiple tabs; PTY continues streaming in the background when tabs are hidden
- **Split panes**: header grid menu — split right / split down (shortcuts configurable in Settings)
- **Search**: available via header search when a terminal tab is active
- **Shell integration**: cwd tracking (OSC 7), prompt boundaries (OSC 133)
- **Private terminal tab**: AI cannot read the buffer (incognito badge on status bar)
- **WSL** workspace environment (workspace selector on status bar)
- GenCode brand welcome banner shown once per shell session

**Tips**

- Use `\r` (CR) for Enter in programmatic PTY writes, not `\n`
- If only a cursor appears after a layout change, open a **new terminal tab**

---

## 5. AI assistant

Open with **`Ctrl+I`** or status bar **Open AI assistant**.

### 5.1 Models

Supported providers: OpenAI, Anthropic, Google, xAI, Cerebras, Groq, DeepSeek, Mistral, OpenRouter, Qwen, Zhipu, Moonshot, OpenAI-compatible custom endpoints, and local **LM Studio / MLX / Ollama**.

Configure under **Settings → Models**. Keys never touch disk (OS keychain).

### 5.2 Composer input

- Multi-line input; **Enter** to send (binding configurable in Settings)
- **Attachments** menu: attach files, paste clipboard screenshot, **capture screen** (requires vision-capable model)
- **Voice input** (configure in Settings first)
- Tool calls requiring approval show an **approval card** inline in the conversation

### 5.3 Agents and skills

- **Settings → Agent**: 15 built-in presets, custom agents, **snippets**, custom instruction templates
- In-chat **slash commands**
- **Plan mode** and diff review for proposed edits
- **Sub-agents** (explore, review, security, general)
- Project memory via `GENCODE.md` in the workspace root

### 5.4 Selection ask

Select text in the editor and press **`Ctrl+L`** — an "Ask 灵码ADE" prompt appears to the right of the code area.

### 5.5 Claude launched via AI tool

When the agent uses a managed-agent tool it can automatically **open a new terminal tab** and run `claude` with a prompt (different from the status bar CC button behavior).

---

## 6. Claude Code

### 6.1 Status bar launcher

Click the **CC icon** to **always create a new** terminal tab named `claude` and run the CLI. If not installed, you are redirected to **Settings → Claude Code**.

### 6.2 Manual use

After installation, run `claude` in any normal terminal tab. Each time GenCode launches claude (via status bar or AI tool), it **re-merges the Chinese locale** (`language: chinese`, `zh_CN.UTF-8`) into `~/.claude/settings.json` to prevent external proxy manager tools from overwriting and stripping the language setting.

> **Note**: `language: chinese` controls the **AI reply language** only — it does not affect the CLI UI text (the CLI has no built-in i18n).

### 6.3 Settings → Claude Code

- Install / update Node.js and Claude Code CLI
- **MCP server** management (writes `~/.gencode/claude-config/.mcp.json`)
- Version detection and one-click upgrade

### 6.4 Settings → Claude skills

Search and install extension skills from GitHub / GitLab / Gitee.

### 6.5 Command reference

**`Ctrl+Shift+?`** opens a Chinese command palette with 60+ Claude Code commands.

### 6.6 Notifications

The notification bell surfaces agent / Claude Code events. Enable Claude Code notifications from the bell menu when prompted.

---

## 7. Editor

- Multi-language: TS/JS, Rust, Python, Go, C/C++/Java/C#, PHP, HTML/CSS, JSON, Markdown, and more
- **Markdown**: toggle **Preview** / **Markdown** in the toolbar (preview syncs unsaved content)
- **AI inline autocomplete** (when configured)
- **AI diff tab**: accept/reject hunks from agent edits
- **Find/replace**: `Ctrl+H`
- **Format document**: `Ctrl+Shift+Alt+F` or right-click **Format code** (Rust: `cargo fmt`; others: Prettier when available; saves the file first)
- **Context menu**: undo, redo, cut, copy, paste, format
- Vim mode, word wrap, line/column on status bar
- Unsaved-close dialog: Save / Don't save / Cancel
- **11 built-in themes**; **GenCode Dark** is the dark default (terminal-style palette: red keywords, yellow strings, green functions/properties, blue numbers, grey comments)

---

## 8. File explorer and Git

### Explorer

- Catppuccin file icons, fuzzy search `Ctrl+Shift+F`
- Inline rename, right-click menu (open, reveal in Explorer, copy path, attach to AI, etc.)
- Clipboard cut/copy/paste for files (platform-dependent)

### Source control

- Stage, unstage, commit (`Ctrl+Enter` / `Cmd+Enter`), push
- Aligned with the **explorer project root** (open a folder containing `.git`)
- Per-file diff tabs, Git history panel with commit graph

---

## 9. Settings (`Ctrl+,`)

In-app **overlay** inside the main window (no separate settings window). Sections:

| Tab | Purpose |
|---|---|
| General | Appearance, zoom, editor, terminal, startup |
| Themes | App and editor themes, background image |
| Shortcuts | Keybindings; `Ctrl+K` quick reference |
| Models | API keys and default models |
| Agent | Presets, custom agents, snippets, custom instructions |
| Claude Code | Runtime install, MCP |
| Claude skills | Extension skills from remote repos |
| About | Version, check for updates, links |

---

## 10. Security and privacy

- AI tool **sandbox presets** (permissive / standard / strict), policy file at `~/.gencode/`
- **Private terminal tabs**: output excluded from AI context
- Rust backend outbound HTTP has **SSRF protection** (DNS rebinding defense)
- Agent tool path deny list and shell command validation
- **No telemetry**, no account system

Report vulnerabilities via [SECURITY.md](../../SECURITY.md).

---

## 11. Common shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+I` | Toggle right AI assistant panel |
| `Ctrl+L` | Ask AI about editor selection |
| `Ctrl+,` | Open Settings |
| `Ctrl+Shift+?` | Claude Code command reference |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+T` | New terminal tab |
| `Ctrl+D` / `Ctrl+Shift+D` | Split terminal right / down |
| `Ctrl+H` | Find and replace |
| `Ctrl+Shift+Alt+F` | Format current file |
| `Ctrl+K` | Shortcut search |

Full list: **Settings → Shortcuts**.

---

## 12. v1.0.0 highlights

- Cursor-style **three-pane** layout + right AI panel
- **In-app settings** overlay; Agent page (snippets + custom instructions)
- Status bar **CC icon** and **Open AI assistant** separated
- Composer **attachments** (file, clipboard screenshot, screen capture)
- Markdown **preview/source** toggle
- Explorer empty on first run; **last project** restored on relaunch
- **GenCode Dark** editor theme (terminal color palette, dark default)
- Fixed editor content invisible under dark theme
- Claude Code: **re-merge Chinese locale on every launch** to prevent external proxy tools from stripping the language setting
- Vim mode toggle description clarified in Settings
- Windows CI: NSIS installer + portable zip with context-menu helper scripts

---

## 13. Getting help

- [GitHub Issues](https://github.com/bjlida/GenCode/issues)
- [Releases](https://github.com/bjlida/GenCode/releases) for installers and updates
- 简体中文: [功能指南](../zh-CN/user-guide.md)
