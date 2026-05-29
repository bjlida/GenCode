import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from "ai";
import {
  DEFAULT_MODEL_ID,
  getModel,
  getModelContextLimit,
  LMSTUDIO_DEFAULT_BASE_URL,
  MAX_AGENT_STEPS,
  MLX_DEFAULT_BASE_URL,
  modelKeepsReasoning,
  MOONSHOT_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_BASE_URL,
  providerNeedsKey,
  QWEN_DEFAULT_BASE_URL,
  selectSystemPrompt,
  ZHIPU_DEFAULT_BASE_URL,
  type ModelId,
  type ProviderId,
} from "../config";
import { buildTools, type ToolContext } from "../tools/tools";
import { compactModelMessagesDetailed } from "./compact";
import type { ProviderKeys } from "./keyring";
import { createProxyFetch } from "./proxyFetch";

const localProxyFetch = createProxyFetch({ allowPrivateNetwork: true });

const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> =
  {
    read_file: (i) => `读取 ${shortPath(i.path)}`,
    list_directory: (i) => `列出 ${shortPath(i.path)}`,
    grep: (i) => `搜索 ${ellipsize(String(i.pattern ?? ""), 40)}`,
    glob: (i) => `匹配 ${ellipsize(String(i.pattern ?? ""), 40)}`,
    edit: (i) => `编辑 ${shortPath(i.path)}`,
    multi_edit: (i) => `编辑 ${shortPath(i.path)}`,
    write_file: (i) => `写入 ${shortPath(i.path)}`,
    create_directory: (i) => `创建 ${shortPath(i.path)}`,
    bash_run: (i) => `运行 ${ellipsize(String(i.command ?? ""), 60)}`,
    bash_background: (i) =>
      `启动 ${ellipsize(String(i.command ?? ""), 60)}`,
    bash_logs: () => `读取日志`,
    bash_list: () => `列出后台进程`,
    bash_kill: () => `终止后台进程`,
    suggest_command: (i) =>
      `建议 ${ellipsize(String(i.command ?? ""), 60)}`,
    todo_write: (i) =>
      `更新计划（${Array.isArray(i.todos) ? i.todos.length : 0} 项）`,
    run_subagent: (i) => `启动 ${String(i.type ?? "subagent")} 子代理`,
  };

function shortPath(p: unknown): string {
  if (typeof p !== "string") return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function ellipsize(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export type BuildModelOptions = {
  modelIdOverride?: string;
  lmstudioBaseURL?: string;
  mlxBaseURL?: string;
  ollamaBaseURL?: string;
  openaiCompatibleBaseURL?: string;
  qwenBaseURL?: string;
  zhipuBaseURL?: string;
  moonshotBaseURL?: string;
};

const modelCache = new Map<string, LanguageModel>();

export async function buildLanguageModel(
  provider: ProviderId,
  keys: ProviderKeys,
  resolvedModelId: string,
  options: BuildModelOptions = {},
): Promise<LanguageModel> {
  if (providerNeedsKey(provider) && !keys[provider]) {
    throw new Error(
      `${provider} 未配置 API 密钥。请在设置 → 模型中添加密钥。`,
    );
  }
  const key = keys[provider] ?? "";
  const lmstudioURL = options.lmstudioBaseURL ?? LMSTUDIO_DEFAULT_BASE_URL;
  const mlxURL = options.mlxBaseURL ?? MLX_DEFAULT_BASE_URL;
  const ollamaURL = options.ollamaBaseURL ?? OLLAMA_DEFAULT_BASE_URL;
  const compatURL = options.openaiCompatibleBaseURL ?? "";
  const qwenURL = options.qwenBaseURL ?? QWEN_DEFAULT_BASE_URL;
  const zhipuURL = options.zhipuBaseURL ?? ZHIPU_DEFAULT_BASE_URL;
  const moonshotURL = options.moonshotBaseURL ?? MOONSHOT_DEFAULT_BASE_URL;
  const cacheKey = `${provider} ${key} ${resolvedModelId} ${lmstudioURL} ${mlxURL} ${ollamaURL} ${compatURL} ${qwenURL} ${zhipuURL} ${moonshotURL}`;
  const hit = modelCache.get(cacheKey);
  if (hit) return hit;

  let built: LanguageModel;
  switch (provider) {
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      built = createOpenAI({ apiKey: key })(resolvedModelId);
      break;
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      built = createAnthropic({ apiKey: key })(resolvedModelId);
      break;
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      built = createGoogleGenerativeAI({ apiKey: key })(resolvedModelId);
      break;
    }
    case "xai": {
      const { createXai } = await import("@ai-sdk/xai");
      built = createXai({ apiKey: key })(resolvedModelId);
      break;
    }
    case "cerebras": {
      const { createCerebras } = await import("@ai-sdk/cerebras");
      built = createCerebras({ apiKey: key })(resolvedModelId);
      break;
    }
    case "deepseek": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com",
        apiKey: key,
      })(resolvedModelId);
      break;
    }
    case "mistral": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "mistral",
        baseURL: "https://api.mistral.ai/v1",
        apiKey: key,
      })(resolvedModelId);
      break;
    }
    case "groq": {
      const { createGroq } = await import("@ai-sdk/groq");
      built = createGroq({ apiKey: key })(resolvedModelId);
      break;
    }
    case "openrouter": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: key,
        headers: {
          "HTTP-Referer": "https://gencode.ai",
          "X-Title": "GenCode",
        },
      })(resolvedModelId);
      break;
    }
    case "openai-compatible": {
      if (!compatURL) {
        throw new Error(
          "OpenAI-compatible 服务商未设置 Base URL。请在设置 → 模型中配置。",
        );
      }
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: compatURL,
        apiKey: key || undefined,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "lmstudio": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "lmstudio",
        baseURL: lmstudioURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "mlx": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "mlx",
        baseURL: mlxURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "ollama": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "ollama",
        baseURL: ollamaURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "qwen": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "qwen",
        baseURL: qwenURL,
        apiKey: key,
      })(resolvedModelId);
      break;
    }
    case "zhipu": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "zhipu",
        baseURL: zhipuURL,
        apiKey: key,
      })(resolvedModelId);
      break;
    }
    case "moonshot": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "moonshot",
        baseURL: moonshotURL,
        apiKey: key,
      })(resolvedModelId);
      break;
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`不支持的服务商: ${_exhaustive as ProviderId}`);
    }
  }
  modelCache.set(cacheKey, built);
  return built;
}

export type LocalProviderConfig = {
  lmstudioBaseURL?: string;
  lmstudioModelId?: string;
  mlxBaseURL?: string;
  mlxModelId?: string;
  ollamaBaseURL?: string;
  ollamaModelId?: string;
  openaiCompatibleBaseURL?: string;
  openaiCompatibleModelId?: string;
  openrouterModelId?: string;
  qwenBaseURL?: string;
  qwenModelId?: string;
  zhipuBaseURL?: string;
  zhipuModelId?: string;
  moonshotBaseURL?: string;
  moonshotModelId?: string;
};

export function buildConfiguredLanguageModel(
  modelId: ModelId,
  keys: ProviderKeys,
  local: LocalProviderConfig = {},
): Promise<LanguageModel> {
  const m = getModel(modelId);
  let resolvedId: string = m.id;
  if (m.id === "lmstudio-local") {
    if (!local.lmstudioModelId?.trim()) {
      throw new Error(
        "LM Studio：未设置模型 ID。请在设置 → 模型中输入 LM Studio 中加载的模型 ID。",
      );
    }
    resolvedId = local.lmstudioModelId.trim();
  } else if (m.id === "mlx-local") {
    if (!local.mlxModelId?.trim()) {
      throw new Error(
        "MLX：未设置模型 ID。请在设置 → 模型中输入 mlx_lm.server 提供的模型 ID。",
      );
    }
    resolvedId = local.mlxModelId.trim();
  } else if (m.id === "ollama-local") {
    if (!local.ollamaModelId?.trim()) {
      throw new Error(
        "Ollama：未设置模型 ID。请在设置 → 模型中输入模型 ID（例如 `ollama list` 中的名称）。",
      );
    }
    resolvedId = local.ollamaModelId.trim();
  } else if (m.id === "openai-compatible-custom") {
    if (!local.openaiCompatibleModelId?.trim()) {
      throw new Error(
        "OpenAI-compatible：未设置模型 ID。请在设置 → 模型中进行配置。",
      );
    }
    resolvedId = local.openaiCompatibleModelId.trim();
  } else if (m.id === "openrouter-custom") {
    if (!local.openrouterModelId?.trim()) {
      throw new Error(
        "OpenRouter：未设置模型 ID。请在设置 → 模型中输入 OpenRouter 模型 ID（例如 anthropic/claude-sonnet-4-6）。",
      );
    }
    resolvedId = local.openrouterModelId.trim();
  }
  return buildLanguageModel(m.provider, keys, resolvedId, {
    lmstudioBaseURL: local.lmstudioBaseURL,
    mlxBaseURL: local.mlxBaseURL,
    ollamaBaseURL: local.ollamaBaseURL,
    openaiCompatibleBaseURL: local.openaiCompatibleBaseURL,
    qwenBaseURL: local.qwenBaseURL,
    zhipuBaseURL: local.zhipuBaseURL,
    moonshotBaseURL: local.moonshotBaseURL,
  });
}

const PLAN_MODE_PROMPT = `## PLAN MODE — ACTIVE
Mutating tools (write_file, edit, multi_edit, create_directory) will queue their changes for the user to review as a single diff. Do NOT execute bash_run or bash_background while plan mode is active — restrict yourself to reads (read_file, grep, glob, list_directory) and the queued mutations. After queueing the full set of edits, stop and return a brief summary; do not continue acting until the user has accepted/rejected.`;

function buildStableSystem(
  modelId: ModelId,
  persona: { name: string; instructions: string } | null,
  customInstructions: string | undefined,
  projectMemory: string | null,
): string {
  const base = selectSystemPrompt(getModel(modelId).id);
  const personaBlock = persona?.instructions.trim()
    ? `\n\n## ACTIVE AGENT — ${persona.name}\n${persona.instructions.trim()}`
    : "";
  const customBlock = customInstructions?.trim()
    ? `\n\n## USER CUSTOM INSTRUCTIONS — follow unless they conflict with safety rules above\n${customInstructions.trim()}`
    : "";
  const memoryBlock =
    projectMemory && projectMemory.trim().length > 0
      ? `\n\n## PROJECT — GENCODE.md\n${projectMemory.trim()}`
      : "";
  return `${base}${memoryBlock}${personaBlock}${customBlock}`;
}

// OpenAI / Gemini / DeepSeek apply prefix caching automatically; only
// Anthropic needs explicit breakpoints. Mark the stable system prefix and
// the rotating conversation tail.
function applyCacheBreakpoints(
  messages: ModelMessage[],
  provider: ProviderId,
): ModelMessage[] {
  if (provider !== "anthropic" || messages.length === 0) return messages;
  const marker = {
    anthropic: { cacheControl: { type: "ephemeral" as const } },
  };
  const withMarker = (m: ModelMessage): ModelMessage => ({
    ...m,
    providerOptions: { ...(m.providerOptions ?? {}), ...marker },
  });
  const out = messages.slice();
  out[0] = withMarker(out[0]);
  const lastIdx = out.length - 1;
  if (lastIdx > 0) out[lastIdx] = withMarker(out[lastIdx]);
  return out;
}

export type AgentUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type AgentUsageDelta = AgentUsage & {
  lastInputTokens: number;
  lastCachedTokens: number;
};

const EMPTY_USAGE: AgentUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
};

export type RunAgentOptions = {
  keys: ProviderKeys;
  modelId?: ModelId;
  customInstructions?: string;
  agentPersona?: { name: string; instructions: string } | null;
  toolContext: ToolContext;
  onStep?: (step: string | null) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onCompact?: (info: { droppedCount: number }) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  lmstudioBaseURL?: string;
  lmstudioModelId?: string;
  mlxBaseURL?: string;
  mlxModelId?: string;
  ollamaBaseURL?: string;
  ollamaModelId?: string;
  openaiCompatibleBaseURL?: string;
  openaiCompatibleModelId?: string;
  openaiCompatibleContextLimit?: number;
  openrouterModelId?: string;
  qwenBaseURL?: string;
  qwenModelId?: string;
  zhipuBaseURL?: string;
  zhipuModelId?: string;
  moonshotBaseURL?: string;
  moonshotModelId?: string;
  temperature?: number;
  maxTokens?: number;
  planMode?: boolean;
  projectMemory?: string | null;
  uiMessages: UIMessage[];
  abortSignal?: AbortSignal;
};

export async function runAgentStream(opts: RunAgentOptions) {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const model = await buildConfiguredLanguageModel(modelId, opts.keys, {
    lmstudioBaseURL: opts.lmstudioBaseURL,
    lmstudioModelId: opts.lmstudioModelId,
    mlxBaseURL: opts.mlxBaseURL,
    mlxModelId: opts.mlxModelId,
    ollamaBaseURL: opts.ollamaBaseURL,
    ollamaModelId: opts.ollamaModelId,
    openaiCompatibleBaseURL: opts.openaiCompatibleBaseURL,
    openaiCompatibleModelId: opts.openaiCompatibleModelId,
    openrouterModelId: opts.openrouterModelId,
    qwenBaseURL: opts.qwenBaseURL,
    qwenModelId: opts.qwenModelId,
    zhipuBaseURL: opts.zhipuBaseURL,
    zhipuModelId: opts.zhipuModelId,
    moonshotBaseURL: opts.moonshotBaseURL,
    moonshotModelId: opts.moonshotModelId,
  });
  const provider = getModel(modelId).provider;

  const stableSystem = buildStableSystem(
    modelId,
    opts.agentPersona ?? null,
    opts.customInstructions,
    opts.projectMemory ?? null,
  );

  const history = await convertToModelMessages(opts.uiMessages);
  const prunedHistory = pruneMessages({
    messages: history,
    reasoning: modelKeepsReasoning(modelId) ? "none" : "before-last-message",
    emptyMessages: "remove",
  });
  const compact = compactModelMessagesDetailed(
    prunedHistory,
    getModelContextLimit(
      getModel(modelId).id,
      opts.openaiCompatibleContextLimit,
    ),
  );
  const compactedHistory = compact.messages;
  if (compact.compacted) {
    opts.onCompact?.({ droppedCount: compact.droppedCount });
  }

  const messages: ModelMessage[] = [{ role: "system", content: stableSystem }];
  if (opts.planMode) {
    messages.push({ role: "system", content: PLAN_MODE_PROMPT });
  }
  messages.push(...compactedHistory);

  const finalMessages = applyCacheBreakpoints(messages, provider);

  let stepsSeen = 0;
  return streamText({
    model,
    messages: finalMessages,
    tools: buildTools(opts.toolContext),
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    temperature: opts.temperature,
    maxOutputTokens: opts.maxTokens,
    abortSignal: opts.abortSignal,
    onStepFinish: (step) => {
      stepsSeen++;
      if (opts.onStep) {
        const last = step.toolCalls?.[step.toolCalls.length - 1];
        if (last) {
          const label = TOOL_LABELS[last.toolName];
          opts.onStep(
            label
              ? label((last.input ?? {}) as Record<string, unknown>)
              : `正在调用 ${last.toolName}`,
          );
        } else if (step.text) {
          opts.onStep("正在写入");
        }
      }
      if (opts.onUsage && step.usage) {
        const u = step.usage;
        const stepInput = u.inputTokens ?? 0;
        const stepCached = u.inputTokenDetails?.cacheReadTokens ?? 0;
        opts.onUsage({
          inputTokens: stepInput,
          outputTokens: u.outputTokens ?? 0,
          cachedInputTokens: stepCached,
          lastInputTokens: stepInput,
          lastCachedTokens: stepCached,
        });
      }
    },
    onFinish: (result) => {
      opts.onStep?.(null);
      const finishReason =
        (result as { finishReason?: string } | undefined)?.finishReason ?? "";
      opts.onFinishMeta?.({
        hitStepCap: stepsSeen >= MAX_AGENT_STEPS,
        finishReason,
      });
    },
  });
}

export { EMPTY_USAGE };
