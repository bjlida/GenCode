import {
  CheckListIcon,
  ClaudeIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { usePlanStore } from "../store/planStore";

/**
 * Outcome of intercepting a slash command from the composer.
 *
 * - `"handled"`: command ran; the composer should NOT send a chat message.
 * - `"send-prompt"`: replace the user's text with `prompt` and send normally.
 * - `"none"`: not a slash command; let the composer behave as usual.
 */
export type SlashOutcome =
  | { kind: "handled"; toast?: string; preserveInput?: boolean }
  | { kind: "send-prompt"; prompt: string; commandName?: string }
  | { kind: "none" };

function claudeCodeDirective(request: string): string {
  return `The user wants to drive a Claude Code agent through you. Their request:

<request>
${request}
</request>

You are the orchestrator, not the implementer. Do not write the code yourself.
1. Call read_agent_output to see whether a Claude Code agent is already active in this session.
2. If none is active: turn the request into one clear, complete, self-contained prompt (state the concrete goal, relevant constraints, and what "done" looks like) and call spawn_coding_agent with it.
3. If one is active: read its latest output, then craft a precise follow-up and call send_to_agent.
Sharpen vague requests into precise engineering instructions; keep each agent prompt focused on one coherent unit of work.`;
}

const INIT_PROMPT = `Scan this workspace and produce GENCODE.md at the workspace root with:

- One-paragraph project description.
- Build / test / dev commands.
- Architecture overview (subsystems, data flow, key dirs).
- Conventions worth knowing (naming, patterns, gotchas).
- Paths to entry points.

Use grep/glob/list_directory/read_file to explore. Cap GENCODE.md under 200 lines. Use write_file to create it (will go through normal approval).`;

export type SlashCommandMeta = {
  name: string;
  invocation: string;
  label: string;
  description: string;
  icon: typeof SparklesIcon;
  /** "ai" = built-in AI command (handled by tryRunSlashCommand),
   *  "cc"  = Claude Code command (routed to the CC agent). */
  source: "ai" | "cc";
};

export const SLASH_COMMANDS: Record<string, SlashCommandMeta> = {
  init: {
    name: "init",
    invocation: "/init",
    label: "初始化工作区",
    description:
      "扫描当前工作区并生成 GENCODE.md，包含项目描述、构建命令、架构概览和约定说明。",
    icon: SparklesIcon,
    source: "ai",
  },
  plan: {
    name: "plan",
    invocation: "/plan",
    label: "计划模式",
    description:
      "切换计划模式。开启后 AI 会先制定实现计划再动手，关闭则直接执行。",
    icon: CheckListIcon,
    source: "ai",
  },
  "claude-code": {
    name: "claude-code",
    invocation: "/claude-code",
    label: "委托给 Claude Code",
    description:
      "将复杂工程任务委托给 Claude Code 执行，AI 作为协调者而非实施者。",
    icon: ClaudeIcon,
    source: "ai",
  },
};

export const GENCODE_CMD_RE =
  /^<gencode-command\s+name="([a-z0-9-]+)"(?:\s+state="([a-z]+)")?\s*\/>(?:\n+|$)/;

export function wrapWithCommandMarker(prompt: string, name: string): string {
  return `<gencode-command name="${name}" />\n\n${prompt}`;
}

export function tryRunSlashCommand(input: string): SlashOutcome {
  const trimmed = input.trim();
  const lead = trimmed[0];
  if (lead !== "/" && lead !== "#") return { kind: "none" };
  const [head, ...rest] = trimmed.slice(1).split(/\s+/);
  if (lead === "#" && !SLASH_COMMANDS[head]) return { kind: "none" };
  const tail = rest.join(" ").trim();

  switch (head) {
    case "plan": {
      const store = usePlanStore.getState();
      if (tail === "off" || tail === "exit") {
        store.disable();
        return { kind: "handled", toast: "计划模式已关闭" };
      }
      store.toggle();
      const nowActive = usePlanStore.getState().active;
      return {
        kind: "handled",
        toast: nowActive ? "计划模式已开启" : "计划模式已关闭",
      };
    }
    case "init": {
      return {
        kind: "send-prompt",
        prompt: INIT_PROMPT,
        commandName: "init",
      };
    }
    case "claude-code": {
      if (!tail) {
        return {
          kind: "handled",
          toast: "请补充任务说明，例如：/claude-code 修复登录页的 401 错误",
          preserveInput: true,
        };
      }
      return {
        kind: "send-prompt",
        prompt: claudeCodeDirective(tail),
        commandName: "claude-code",
      };
    }
    default:
      // Unknown / command — route to Claude Code agent as a directive.
      return {
        kind: "send-prompt",
        prompt: claudeCodeDirective(`${head} ${tail}`.trim()),
        commandName: "claude-code",
      };
  }
}
