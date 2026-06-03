import { Button } from "@/components/ui/button";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextTrigger,
} from "@/components/ai-elements/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useChat, type UIMessage } from "@ai-sdk/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  Clock01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";
import { estimateCost, getModel, getModelContextLimit } from "../config";
import type { SessionMeta } from "../lib/sessions";
import { useAgentsStore } from "../store/agentsStore";
import { getOrCreateChat, useChatStore } from "../store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { usePlanStore } from "../store/planStore";
import { AiChatView } from "./AiChat";
import { AiInputBar } from "./AiInputBar";
import { PlanDiffReview } from "./PlanDiffReview";
import { TodoStrip } from "./TodoStrip";

type PanelHeaderProps = {
  step: string | null;
  isBusy: boolean;
  onClose?: () => void;
  messages?: UIMessage[];
};

export function AiAgentPanel({ onClose }: { onClose?: () => void }) {
  const sessionId = useChatStore((s) => s.activeSessionId);
  const closePanel = useChatStore((s) => s.closePanel);

  const handleClose = () => {
    onClose?.();
    closePanel();
  };

  if (!sessionId) {
    return (
      <div className="flex h-full min-h-0 flex-col border-l border-border/60 bg-card/95 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur-xl">
        <PanelHeader step={null} isBusy={false} onClose={handleClose} />
        <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
          加载会话中…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border/60 bg-card/95 supports-[backdrop-filter]:bg-card/90 supports-[backdrop-filter]:backdrop-blur-xl">
      <PanelBody sessionId={sessionId} onClose={handleClose} />
      <PlanDiffReview />
    </div>
  );
}

function PanelBody({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const step = useChatStore((s) => s.agentMeta.step);

  const chat = useMemo(() => getOrCreateChat(sessionId), [sessionId]);
  const helpers = useChat<UIMessage>({ chat });
  const isBusy =
    helpers.status === "submitted" || helpers.status === "streaming";

  return (
    <>
      <PanelHeader
        step={step}
        isBusy={isBusy}
        onClose={onClose}
        messages={helpers.messages}
      />

      <PlanModeStrip />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col [&_.text-sm]:text-[15px] [&_p]:leading-relaxed">
          <AiChatView
            messages={helpers.messages}
            status={helpers.status}
            error={helpers.error}
            clearError={helpers.clearError}
            addToolApprovalResponse={helpers.addToolApprovalResponse}
            stop={helpers.stop}
          />
        </div>
      </div>

      <TodoStrip sessionId={sessionId} />
      <AiInputBar embedded />
    </>
  );
}

function PlanModeStrip() {
  const active = usePlanStore((s) => s.active);
  const queueLen = usePlanStore((s) => s.queue.length);
  const disable = usePlanStore((s) => s.disable);
  if (!active) return null;
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-muted/40 px-3 py-1.5">
      <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
      <span className="text-[13px] font-medium text-foreground">规划模式</span>
      <span className="text-[13px] text-muted-foreground">
        {queueLen > 0 ? `· ${queueLen} 个待执行` : "· 无待执行编辑"}
      </span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={() => disable()}
        className="rounded px-1.5 py-0.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        退出
      </button>
    </div>
  );
}

function PanelHeader({ step, isBusy, onClose, messages }: PanelHeaderProps) {
  void useAgentsStore((s) => s.customAgents);

  return (
    <div className="relative flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3">
      <div className="flex min-w-0 items-center gap-1.5">
        {messages !== undefined ? (
          <ContextIndicator messages={messages} />
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {isBusy ? (
          <span className="flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground">
            <Spinner className="size-2.5" />
            <span className="max-w-32 truncate">{step ?? "思考中…"}</span>
          </span>
        ) : null}
        <SessionPicker />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[12px]"
          onClick={() => {
            useChatStore.getState().newSession();
            useChatStore.getState().focusInput(null);
          }}
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          新对话
        </Button>
        {onClose ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="size-7"
            aria-label="关闭面板"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function estimateTokens(messages: UIMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type === "text") {
        chars += (p as { text?: string }).text?.length ?? 0;
      } else if (p.type === "reasoning") {
        chars += (p as { text?: string }).text?.length ?? 0;
      } else if (typeof p.type === "string" && p.type.startsWith("tool-")) {
        const tp = p as unknown as { input?: unknown; output?: unknown };
        if (tp.input) chars += JSON.stringify(tp.input).length;
        if (tp.output) chars += JSON.stringify(tp.output).length;
      }
    }
  }
  return Math.ceil(chars / 4);
}

function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function ContextIndicator({ messages }: { messages: UIMessage[] }) {
  const modelId = useChatStore((s) => s.selectedModelId);
  const tokens = useChatStore((s) => s.agentMeta.tokens);
  const lastInput = useChatStore((s) => s.agentMeta.lastInputTokens);
  const lastCached = useChatStore((s) => s.agentMeta.lastCachedTokens);
  const estimated = useMemo(() => estimateTokens(messages), [messages]);
  const used = lastInput > 0 ? lastInput : estimated;
  const reported = tokens.inputTokens + tokens.outputTokens;
  const openaiCompatibleContextLimit = usePreferencesStore(
    (s) => s.openaiCompatibleContextLimit,
  );
  const max = getModelContextLimit(modelId, openaiCompatibleContextLimit);
  const modelLabel = useMemo(() => {
    try {
      return getModel(modelId).label;
    } catch {
      return modelId;
    }
  }, [modelId]);
  const cost = estimateCost(modelId, tokens);
  const cacheRate =
    tokens.inputTokens > 0
      ? Math.round((tokens.cachedInputTokens / tokens.inputTokens) * 100)
      : 0;

  return (
    <Context usedTokens={used} maxTokens={max} modelId={modelId}>
      <ContextTrigger className="h-7 gap-1 px-1.5 text-[12px] text-muted-foreground hover:text-foreground" />
      <ContextContent align="start" className="min-w-56">
        <ContextContentHeader>
          <span className="text-[13px] font-medium">{modelLabel}</span>
        </ContextContentHeader>
        <ContextContentBody className="space-y-1 text-[12px]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>当前上下文</span>
            <span className="font-mono text-foreground">
              {formatTokens(used)} / {formatTokens(max)}
            </span>
          </div>
          {lastCached > 0 && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>其中缓存</span>
              <span className="font-mono text-foreground">
                {formatTokens(lastCached)}
              </span>
            </div>
          )}
          {reported > 0 && (
            <>
              <div className="mt-1.5 flex items-center justify-between text-muted-foreground">
                <span>会话输入</span>
                <span className="font-mono text-foreground">
                  {formatTokens(tokens.inputTokens)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>会话输出</span>
                <span className="font-mono text-foreground">
                  {formatTokens(tokens.outputTokens)}
                </span>
              </div>
              {tokens.cachedInputTokens > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>缓存命中</span>
                  <span className="font-mono text-foreground">{cacheRate}%</span>
                </div>
              )}
              {cost != null && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>会话费用</span>
                  <span className="font-mono text-foreground">
                    ${cost.toFixed(cost < 0.01 ? 4 : cost < 1 ? 3 : 2)}
                  </span>
                </div>
              )}
            </>
          )}
        </ContextContentBody>
        <ContextContentFooter>
          <span className="text-[12px] italic text-muted-foreground">
            {lastInput > 0
              ? "上次请求反映当前上下文大小。"
              : "Token 数为近似值（字符数 / 4）。"}
          </span>
        </ContextContentFooter>
      </ContextContent>
    </Context>
  );
}

function SessionPicker() {
  const sessions = useChatStore((s) => s.sessions);
  const activeId = useChatStore((s) => s.activeSessionId);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);

  const active = sessions.find((s) => s.id === activeId) ?? null;
  if (!active) return null;

  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const triggerLabel = "历史记录";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 max-w-40 items-center gap-1 rounded-md px-1.5 py-1",
            "text-[12px] text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-foreground",
          )}
          title="历史记录"
        >
          <HugeiconsIcon
            icon={Clock01Icon}
            size={11}
            strokeWidth={1.75}
            className="shrink-0 opacity-70"
          />
          <span className="truncate">{triggerLabel}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={10}
            strokeWidth={2}
            className="opacity-70"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuItem
          onSelect={() => newSession()}
          className="gap-2 text-xs"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          新建会话
        </DropdownMenuItem>
        {sorted.length > 0 ? <DropdownMenuSeparator /> : null}
        {sorted.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            active={s.id === activeId}
            onSelect={() => switchSession(s.id)}
            onDelete={() => deleteSession(s.id)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: SessionMeta;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest("[data-session-delete]")) {
          e.preventDefault();
          return;
        }
        onSelect();
      }}
      className={cn(
        "group flex items-center justify-between gap-2 text-xs",
        active && "bg-accent/40",
      )}
    >
      <span className="min-w-0 flex-1 truncate">
        {session.title || "新对话"}
      </span>
      <button
        type="button"
        data-session-delete
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除会话"
        className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <HugeiconsIcon icon={Delete02Icon} size={11} strokeWidth={1.75} />
      </button>
    </DropdownMenuItem>
  );
}

