//! Claude Code slash command reference — complete list with Chinese translations.
//! Displayed as a quick-help panel in Claude Code terminal tabs.

export interface CcCommand {
  command: string;
  syntax: string;
  zhName: string;
  zhDescription: string;
  category: "session" | "context" | "model" | "code" | "config" | "git" | "plugins" | "automation" | "debug" | "account";
}

export const CC_COMMANDS: CcCommand[] = [
  // ========== Session & Conversation ==========
  {
    command: "/help",
    syntax: "/help [command]",
    zhName: "帮助",
    zhDescription: "显示所有可用命令或指定命令的详细帮助信息。",
    category: "session",
  },
  {
    command: "/clear",
    syntax: "/clear",
    zhName: "清空对话",
    zhDescription: "清空当前对话历史（别名：/reset, /new），CLAUDE.md 保持不变。",
    category: "session",
  },
  {
    command: "/compact",
    syntax: "/compact [retain: <pattern>]",
    zhName: "压缩上下文",
    zhDescription: "压缩对话上下文释放 token 空间，支持 retain: 保留特定内容。",
    category: "session",
  },
  {
    command: "/resume",
    syntax: "/resume",
    zhName: "恢复会话",
    zhDescription: "切换或恢复之前保存的对话会话（别名：/continue）。",
    category: "session",
  },
  {
    command: "/rename",
    syntax: "/rename [name]",
    zhName: "重命名",
    zhDescription: "重命名当前会话，方便后续查找和恢复。",
    category: "session",
  },
  {
    command: "/export",
    syntax: "/export",
    zhName: "导出对话",
    zhDescription: "将当前对话导出为 Markdown 文件。",
    category: "session",
  },
  {
    command: "/exit",
    syntax: "/exit",
    zhName: "退出",
    zhDescription: "退出 Claude Code（别名：/quit）。",
    category: "session",
  },
  {
    command: "/rewind",
    syntax: "/rewind",
    zhName: "回退",
    zhDescription: "撤销代码更改和对话到检查点（别名：/checkpoint）。",
    category: "session",
  },
  {
    command: "/branch",
    syntax: "/branch",
    zhName: "分支对话",
    zhDescription: "从当前位置创建对话分支，可并行探索不同方案（别名：/fork）。",
    category: "session",
  },
  {
    command: "/goal",
    syntax: "/goal [condition]",
    zhName: "目标设定",
    zhDescription: "设定完成条件，显示实时进度覆盖层（回合数/Token 数）。",
    category: "session",
  },

  // ========== Context & Resources ==========
  {
    command: "/context",
    syntax: "/context",
    zhName: "查看上下文",
    zhDescription: "可视化 Token 使用情况（颜色网格），提供优化建议。",
    category: "context",
  },
  {
    command: "/cost",
    syntax: "/cost",
    zhName: "查看费用",
    zhDescription: "显示当前会话的 Token 消耗和费用估算。",
    category: "context",
  },
  {
    command: "/usage",
    syntax: "/usage",
    zhName: "用量统计",
    zhDescription: "统一的费用 + 统计视图（取代 /cost 和 /stats）。",
    category: "context",
  },
  {
    command: "/status",
    syntax: "/status",
    zhName: "系统状态",
    zhDescription: "显示会话状态、上下文使用百分比和系统信息。",
    category: "context",
  },
  {
    command: "/memory",
    syntax: "/memory [text]",
    zhName: "记忆管理",
    zhDescription: "查看或编辑 CLAUDE.md 和导入的记忆文件（跨会话持久化）。",
    category: "context",
  },
  {
    command: "/tasks",
    syntax: "/tasks",
    zhName: "任务列表",
    zhDescription: "查看当前后台任务分解和进度。",
    category: "context",
  },
  {
    command: "/todos",
    syntax: "/todos",
    zhName: "待办事项",
    zhDescription: "查看当前待办事项列表。",
    category: "context",
  },

  // ========== Model & Mode ==========
  {
    command: "/model",
    syntax: "/model [model-id]",
    zhName: "切换模型",
    zhDescription: "切换 AI 模型（Sonnet / Opus / Haiku）。不传参数则打开交互选择器。",
    category: "model",
  },
  {
    command: "/plan",
    syntax: "/plan [task]",
    zhName: "计划模式",
    zhDescription: "进入只读计划模式，探索代码但不做修改。确认后再执行。",
    category: "model",
  },
  {
    command: "/execute",
    syntax: "/execute",
    zhName: "执行计划",
    zhDescription: "退出计划模式，开始应用计划中的修改。",
    category: "model",
  },
  {
    command: "/fast",
    syntax: "/fast",
    zhName: "快速模式",
    zhDescription: "切换高速模式（约 2.5 倍速度，约 6 倍费用）。",
    category: "model",
  },
  {
    command: "/effort",
    syntax: "/effort [level]",
    zhName: "推理深度",
    zhDescription: "设置推理深度，直接影响推理质量和 Token 消耗。",
    category: "model",
  },
  {
    command: "/vim",
    syntax: "/vim",
    zhName: "Vim 模式",
    zhDescription: "切换 Vim 键盘绑定用于输入编辑。",
    category: "model",
  },
  {
    command: "/output-style",
    syntax: "/output-style [style]",
    zhName: "输出样式",
    zhDescription: "控制 Claude Code 的输出格式和风格。",
    category: "model",
  },
  {
    command: "/voice",
    syntax: "/voice",
    zhName: "语音模式",
    zhDescription: "切换语音输入模式（如果可用）。",
    category: "model",
  },
  {
    command: "/scroll-speed",
    syntax: "/scroll-speed [value]",
    zhName: "滚动速度",
    zhDescription: "调整 TUI 界面鼠标滚轮滚动速度。",
    category: "model",
  },

  // ========== Code & Quality ==========
  {
    command: "/init",
    syntax: "/init",
    zhName: "初始化项目",
    zhDescription: "扫描项目并生成 CLAUDE.md 项目记忆文件。",
    category: "code",
  },
  {
    command: "/review",
    syntax: "/review [scope]",
    zhName: "代码审查",
    zhDescription: "对 PR/文件/代码片段请求代码审查。",
    category: "code",
  },
  {
    command: "/security-review",
    syntax: "/security-review",
    zhName: "安全审查",
    zhDescription: "对当前分支的待定更改进行安全审计。",
    category: "code",
  },
  {
    command: "/diff",
    syntax: "/diff",
    zhName: "查看差异",
    zhDescription: "显示当前工作区未暂存的 git 更改，交互式查看。",
    category: "code",
  },
  {
    command: "/simplify",
    syntax: "/simplify",
    zhName: "简化代码",
    zhDescription: "检测过度工程化，派 3 个子代理检查可复用性/质量/效率并自动修复。",
    category: "code",
  },
  {
    command: "/btw",
    syntax: "/btw [question]",
    zhName: "快速提问",
    zhDescription: "创建临时只读代理快速回答问题，不修改项目状态。",
    category: "code",
  },
  {
    command: "/copy",
    syntax: "/copy",
    zhName: "复制代码",
    zhDescription: "交互式代码块选择器，用于选取和复制代码。",
    category: "code",
  },
  {
    command: "/insights",
    syntax: "/insights",
    zhName: "使用分析",
    zhDescription: "生成使用分析报告（模型使用、摩擦点、偏好等）。",
    category: "code",
  },

  // ========== Git ==========
  {
    command: "/commit",
    syntax: "/commit",
    zhName: "提交代码",
    zhDescription: "自动生成 commit message 并提交当前暂存的更改。",
    category: "git",
  },
  {
    command: "/pr",
    syntax: "/pr [description]",
    zhName: "创建 PR",
    zhDescription: "创建 Pull Request，自动生成 PR 描述和摘要。",
    category: "git",
  },
  {
    command: "/pr_comments",
    syntax: "/pr_comments",
    zhName: "PR 评论",
    zhDescription: "查看当前 PR 的内联评论。",
    category: "git",
  },

  // ========== Configuration & Permissions ==========
  {
    command: "/config",
    syntax: "/config [key] [value]",
    zhName: "配置设置",
    zhDescription: "打开设置编辑器或直接修改配置项（主题、模型、权限等）。",
    category: "config",
  },
  {
    command: "/update-config",
    syntax: "/update-config",
    zhName: "更新配置",
    zhDescription: "配置 settings.json（hooks、权限、环境变量）。",
    category: "config",
  },
  {
    command: "/permissions",
    syntax: "/permissions",
    zhName: "权限管理",
    zhDescription: "查看和修改工具执行权限（允许/拒绝/询问）。",
    category: "config",
  },
  {
    command: "/fewer-permission-prompts",
    syntax: "/fewer-permission-prompts",
    zhName: "减少权限提示",
    zhDescription: "自动允许常用的只读命令，减少重复的权限弹窗。",
    category: "config",
  },
  {
    command: "/add-dir",
    syntax: "/add-dir <path>",
    zhName: "添加目录",
    zhDescription: "添加一个新的工作目录，Claude 可访问其中的文件。",
    category: "config",
  },
  {
    command: "/keybindings-help",
    syntax: "/keybindings-help",
    zhName: "快捷键帮助",
    zhDescription: "查看和编辑自定义键盘绑定文件。",
    category: "config",
  },
  {
    command: "/statusline",
    syntax: "/statusline",
    zhName: "状态栏",
    zhDescription: "自定义终端状态栏的显示内容和样式。",
    category: "config",
  },
  {
    command: "/terminal-setup",
    syntax: "/terminal-setup",
    zhName: "终端集成",
    zhDescription: "安装或更新 shell 集成（bash/zsh/WezTerm）。",
    category: "config",
  },

  // ========== Plugins & Extensions ==========
  {
    command: "/plugin install",
    syntax: "/plugin install <name>",
    zhName: "安装插件",
    zhDescription: "从插件市场安装指定插件。",
    category: "plugins",
  },
  {
    command: "/plugin enable",
    syntax: "/plugin enable <name>",
    zhName: "启用插件",
    zhDescription: "启用已安装的插件。",
    category: "plugins",
  },
  {
    command: "/plugin disable",
    syntax: "/plugin disable <name>",
    zhName: "禁用插件",
    zhDescription: "禁用指定插件但保留安装。",
    category: "plugins",
  },
  {
    command: "/plugin list",
    syntax: "/plugin list",
    zhName: "插件列表",
    zhDescription: "列出所有已安装的插件。",
    category: "plugins",
  },
  {
    command: "/plugin marketplace",
    syntax: "/plugin marketplace",
    zhName: "插件市场",
    zhDescription: "浏览可用的社区插件市场。",
    category: "plugins",
  },
  {
    command: "/plugin validate",
    syntax: "/plugin validate",
    zhName: "验证插件",
    zhDescription: "验证插件结构和配置的正确性。",
    category: "plugins",
  },
  {
    command: "/mcp",
    syntax: "/mcp [action]",
    zhName: "MCP 管理",
    zhDescription: "管理 MCP（Model Context Protocol）服务器：list/add/remove/start/stop。",
    category: "plugins",
  },
  {
    command: "/agents",
    syntax: "/agents",
    zhName: "技能管理",
    zhDescription: "管理技能（sub-agents）。",
    category: "plugins",
  },
  {
    command: "/skills",
    syntax: "/skills",
    zhName: "技能管理",
    zhDescription: "技能管理：加载/卸载/查看已安装的技能。",
    category: "plugins",
  },
  {
    command: "/find-skills",
    syntax: "/find-skills [query]",
    zhName: "搜索技能",
    zhDescription: "浏览和搜索社区技能库。",
    category: "plugins",
  },

  // ========== Automation ==========
  {
    command: "/run",
    syntax: "/run",
    zhName: "运行项目",
    zhDescription: "启动并驱动项目应用，验证更改是否生效。",
    category: "automation",
  },
  {
    command: "/verify",
    syntax: "/verify",
    zhName: "验证更改",
    zhDescription: "验证代码变更确实按预期工作。",
    category: "automation",
  },
  {
    command: "/loop",
    syntax: "/loop [interval] [prompt]",
    zhName: "循环执行",
    zhDescription: "定时重复执行命令（如 /loop 5m /run 每 5 分钟运行一次）。",
    category: "automation",
  },
  {
    command: "/batch",
    syntax: "/batch",
    zhName: "批量重构",
    zhDescription: "并行多工作树重构 — 将大型重构拆分为 5-30 个独立代理并行执行。",
    category: "automation",
  },
  {
    command: "/autofix-pr",
    syntax: "/autofix-pr",
    zhName: "自动修 PR",
    zhDescription: "云端代理监控 PR 并在 CI 失败时自动推送修复。",
    category: "automation",
  },
  {
    command: "/schedule",
    syntax: "/schedule [task]",
    zhName: "任务调度",
    zhDescription: "管理云端定时任务 — 对话式创建/查看/删除调度任务。",
    category: "automation",
  },
  {
    command: "/claude-api",
    syntax: "/claude-api",
    zhName: "API 开发",
    zhDescription: "构建、调试和优化 Claude API / Anthropic SDK 应用。",
    category: "automation",
  },

  // ========== Debug & Diagnostics ==========
  {
    command: "/debug",
    syntax: "/debug",
    zhName: "调试模式",
    zhDescription: "为当前会话启用详细调试日志。",
    category: "debug",
  },
  {
    command: "/doctor",
    syntax: "/doctor",
    zhName: "诊断修复",
    zhDescription: "健康检查（6 项：Node.js 版本、API 连接、认证、Git、磁盘空间）。",
    category: "debug",
  },
  {
    command: "/bug",
    syntax: "/bug",
    zhName: "报告 Bug",
    zhDescription: "报告 bug，将对话和日志发送给 Anthropic 团队。",
    category: "debug",
  },
  {
    command: "/stats",
    syntax: "/stats",
    zhName: "统计数据",
    zhDescription: "可视化使用图表、连续使用天数、模型偏好。",
    category: "debug",
  },
  {
    command: "/release-notes",
    syntax: "/release-notes",
    zhName: "版本说明",
    zhDescription: "查看当前版本和最近的更新日志。",
    category: "debug",
  },

  // ========== Account & Remote ==========
  {
    command: "/login",
    syntax: "/login",
    zhName: "登录",
    zhDescription: "重新认证 Anthropic 账户。",
    category: "account",
  },
  {
    command: "/logout",
    syntax: "/logout",
    zhName: "退出登录",
    zhDescription: "清除 API 密钥并退出登录。",
    category: "account",
  },
  {
    command: "/upgrade",
    syntax: "/upgrade",
    zhName: "升级版本",
    zhDescription: "检查并升级 Claude Code CLI 到最新版本。",
    category: "account",
  },
  {
    command: "/remote-env",
    syntax: "/remote-env",
    zhName: "远程环境",
    zhDescription: "配置远程执行环境。",
    category: "account",
  },
  {
    command: "/install-github-app",
    syntax: "/install-github-app",
    zhName: "GitHub 集成",
    zhDescription: "设置 GitHub App 集成，用于自动 PR 审查等。",
    category: "account",
  },
];

/** Filter commands by a search query (matches command, name, or description). */
export function searchCommands(query: string): CcCommand[] {
  const q = query.toLowerCase().trim();
  if (!q) return CC_COMMANDS;
  return CC_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(q) ||
      c.zhName.toLowerCase().includes(q) ||
      c.zhDescription.toLowerCase().includes(q),
  );
}

/** Group commands by category for display. */
export function commandsByCategory(): Map<string, CcCommand[]> {
  const map = new Map<string, CcCommand[]>();
  for (const c of CC_COMMANDS) {
    const list = map.get(c.category) || [];
    list.push(c);
    map.set(c.category, list);
  }
  return map;
}

export const CATEGORY_LABELS: Record<string, string> = {
  session: "会话管理",
  context: "上下文与资源",
  model: "模型与模式",
  code: "代码与质量",
  git: "版本控制",
  config: "配置与权限",
  plugins: "插件与扩展",
  automation: "自动化",
  debug: "诊断与调试",
  account: "账户与远程",
};

import { TerminalIcon } from "@hugeicons/core-free-icons";
import type { SlashCommandMeta } from "@/modules/ai/lib/slashCommands";

function ccName(cmd: string): string {
  return cmd.replace(/^\//, "");
}

export const CC_SLASH_COMMANDS: SlashCommandMeta[] = CC_COMMANDS.map(
  (c): SlashCommandMeta => ({
    name: ccName(c.command),
    invocation: c.command,
    label: c.zhName,
    description: c.zhDescription,
    icon: TerminalIcon,
    source: "cc",
  }),
);
