import { tool } from "ai";
import { z } from "zod";
import { checkShellCommand } from "../lib/security";
import type { ToolContext } from "./context";

export function buildTerminalTools(ctx: ToolContext) {
  return {
    suggest_command: tool({
      description:
        "Propose a single shell command. Renders a card in chat with an 'Insert' button — the command is NOT written to any terminal automatically; only the user's click inserts it at the prompt without executing. Use this when the answer IS a command.",
      inputSchema: z.object({
        command: z
          .string()
          .describe("The shell command. Single line, no trailing newline."),
        explanation: z
          .string()
          .optional()
          .describe("Optional one-line note shown beside the command."),
      }),
      execute: async ({ command, explanation }) => {
        const safety = checkShellCommand(command);
        if (!safety.ok) return { error: safety.reason };
        // Reject control bytes — the user inserts via click, but the rendered
        // command must reflect exactly what will land at the prompt.
        if (/[\n\r\x00\x1b\x07]/.test(command)) {
          return { error: "命令必须是单行且不含控制字符" };
        }
        return { command, explanation };
      },
    }),

    get_terminal_output: tool({
      description:
        "Return the tail of the active terminal's scrollback. Use this when the user references 'this error', 'the last command', or you need to interpret recent terminal output. Default is 80 lines; raise it only when you genuinely need more. Returns an empty string if there is no active terminal; refuses if the terminal is in Privacy mode.",
      inputSchema: z.object({
        lines: z
          .number()
          .int()
          .min(1)
          .max(2000)
          .optional()
          .describe("Number of trailing lines to return. Default 80."),
      }),
      execute: async ({ lines }) => {
        if (ctx.isActiveTerminalPrivate()) {
          return {
            error:
              "活动终端处于隐私模式；其缓冲区已被隐藏。如需让 AI 查看，请切换到普通标签页。",
          };
        }
        const buffer = ctx.getTerminalContext();
        if (!buffer) return { output: "", note: "无活跃终端" };
        const n = lines ?? 80;
        const parts = buffer.split("\n");
        const sliced = parts.length <= n ? buffer : parts.slice(parts.length - n).join("\n");
        const MAX = 24_000;
        const capped =
          sliced.length > MAX ? `…[truncated]…\n${sliced.slice(sliced.length - MAX)}` : sliced;
        return { output: capped, lines_returned: Math.min(parts.length, n) };
      },
    }),

    open_preview: tool({
      description:
        "Open a preview tab (in-app iframe) at the given URL — restricted to localhost/loopback addresses for the local dev server. Use this after starting a dev server (e.g. `pnpm dev`, `npm run dev`) to surface the rendered page next to the terminal. To preview external sites, the user should paste the URL into the preview address bar themselves.",
      inputSchema: z.object({
        url: z
          .url()
          .describe(
            "Full URL to load (e.g. http://localhost:5173). Must include scheme. Only http/https on loopback hosts are accepted.",
          ),
      }),
      execute: async ({ url }) => {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return { error: "URL 无效", url };
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { error: "仅允许 http/https URL", url };
        }
        const host = parsed.hostname;
        const isLocal =
          host === "localhost" ||
          host === "127.0.0.1" ||
          host === "0.0.0.0" ||
          host === "[::1]" ||
          host === "::1" ||
          host.endsWith(".localhost");
        if (!isLocal) {
          return {
            error:
              "open_preview 仅限 localhost URL。请让用户将外部链接粘贴到预览地址栏。",
            url,
          };
        }
        const ok = ctx.openPreview(url);
        if (!ok) return { error: "预览界面不可用", url };
        return { url, ok: true };
      },
    }),

  } as const;
}
