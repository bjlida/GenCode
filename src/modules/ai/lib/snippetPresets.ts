import type { Snippet } from "./snippets";

/** Starter templates shown in settings — not installed until the user adds one. */
export type SnippetPreset = Omit<Snippet, "id">;

export const SNIPPET_PRESETS: readonly SnippetPreset[] = [
  {
    handle: "commit",
    name: "Commit 信息",
    description: "根据暂存区变更生成规范的 commit message",
    content: `请根据当前 git 暂存区变更，生成一条符合 Conventional Commits 规范的 commit message。

要求：
- 格式：type(scope): summary
- type 用 feat / fix / docs / refactor / test / chore 之一
- summary 用祈使句，不超过 72 字符
- 如有 breaking change，在正文单独说明`,
  },
  {
    handle: "review",
    name: "PR 审查清单",
    description: "按清单逐项审查代码变更",
    content: `请审查本次变更，按以下清单逐项检查并给出结论（通过 / 需修改）：

1. 逻辑正确性：边界条件、错误处理、空值
2. 安全性：注入、路径穿越、密钥泄露
3. 性能：不必要的重复计算、N+1、内存泄漏
4. 可维护性：命名、重复代码、测试覆盖
5. 与项目约定一致：导入风格、路径格式、pnpm-only

每项用「✓ / ✗ + 一句话说明」格式输出。`,
  },
  {
    handle: "explain",
    name: "解释代码",
    description: "用通俗语言解释选中或指定文件的代码",
    content: `请解释这段代码在做什么，按以下结构回答：

1. **一句话概括**：这段代码的核心职责
2. **执行流程**：按调用顺序说明关键步骤
3. **重要细节**：非显而易见的逻辑、依赖、副作用
4. **改进建议**（如有）：只提 1–2 条最有价值的

用中文，避免堆砌术语；必要时用类比帮助理解。`,
  },
];
