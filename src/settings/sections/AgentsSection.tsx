import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AGENT_ICONS } from "@/modules/ai/components/AgentSwitcher";
import {
  BUILTIN_AGENTS,
  type Agent,
  type AgentIconId,
} from "@/modules/ai/lib/agents";
import {
  isValidHandle,
  normalizeHandle,
  type Snippet,
} from "@/modules/ai/lib/snippets";
import { SNIPPET_PRESETS, type SnippetPreset } from "@/modules/ai/lib/snippetPresets";
import { newAgentId, useAgentsStore } from "@/modules/ai/store/agentsStore";
import {
  newSnippetId,
  useSnippetsStore,
} from "@/modules/ai/store/snippetsStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setCustomInstructions } from "@/modules/settings/store";
import {
  Add01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

const ICON_OPTIONS: AgentIconId[] = [
  "coder",
  "architect",
  "reviewer",
  "security",
  "designer",
  "spark",
];

export function AgentsSection() {
  const customInstructions = usePreferencesStore((s) => s.customInstructions);
  const customAgents = useAgentsStore((s) => s.customAgents);
  const activeAgentId = useAgentsStore((s) => s.activeId);
  const setActiveAgentId = useAgentsStore((s) => s.setActiveId);
  const upsertAgent = useAgentsStore((s) => s.upsert);
  const removeAgent = useAgentsStore((s) => s.remove);
  const hydrateAgents = useAgentsStore((s) => s.hydrate);

  const snippets = useSnippetsStore((s) => s.snippets);
  const upsertSnippet = useSnippetsStore((s) => s.upsert);
  const removeSnippet = useSnippetsStore((s) => s.remove);
  const hydrateSnippets = useSnippetsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateAgents();
    void hydrateSnippets();
  }, [hydrateAgents, hydrateSnippets]);

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title="Agent"
        description="配置 AI 面板：全局规则、Agent 角色与可复用片段。"
      />

      <CustomInstructionsBlock value={customInstructions} />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Agent</Label>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2 text-[11px]"
            onClick={() =>
              setEditingAgent({
                id: newAgentId(),
                name: "新建 Agent",
                description: "",
                instructions: "",
                icon: "spark",
                builtIn: false,
              })
            }
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
            新建 Agent
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[...BUILTIN_AGENTS, ...customAgents].map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              active={a.id === activeAgentId}
              onActivate={() => setActiveAgentId(a.id)}
              onEdit={a.builtIn ? null : () => setEditingAgent(a)}
              onDelete={a.builtIn ? null : () => removeAgent(a.id)}
            />
          ))}
        </div>
      </section>

      <SnippetsSection
        snippets={snippets}
        onEdit={setEditingSnippet}
        onRemove={removeSnippet}
        onAddPreset={(preset) =>
          setEditingSnippet({
            id: newSnippetId(),
            ...preset,
          })
        }
      />

      <AgentEditorDialog
        agent={editingAgent}
        existing={customAgents}
        onClose={() => setEditingAgent(null)}
        onSave={(a) => {
          upsertAgent(a);
          setEditingAgent(null);
        }}
      />
      <SnippetEditorDialog
        snippet={editingSnippet}
        existing={snippets}
        onClose={() => setEditingSnippet(null)}
        onSave={(s) => {
          upsertSnippet(s);
          setEditingSnippet(null);
        }}
      />
    </div>
  );
}

function SnippetsSection({
  snippets,
  onEdit,
  onRemove,
  onAddPreset,
}: {
  snippets: Snippet[];
  onEdit: (s: Snippet) => void;
  onRemove: (id: string) => void;
  onAddPreset: (preset: SnippetPreset) => void;
}) {
  const usedHandles = new Set(snippets.map((s) => s.handle));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Label>片段</Label>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            可复用的提示词模板。与 Agent 不同：Agent 决定 AI
            整段对话的角色；片段只在
            <span className="font-medium text-foreground/80">发送那一条消息</span>
            时插入内容。
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1.5 px-2 text-[11px]"
          onClick={() =>
            onEdit({
              id: newSnippetId(),
              handle: "",
              name: "",
              description: "",
              content: "",
            })
          }
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.75} />
          新建片段
        </Button>
      </div>

      <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
        <p className="text-[10.5px] font-medium text-foreground/80">如何使用</p>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[10.5px] leading-relaxed text-muted-foreground">
          <li>创建片段，设置句柄（如 <code className="font-mono">commit</code>）</li>
          <li>
            打开 AI 面板（<kbd className="rounded border border-border/50 bg-background/60 px-1 font-mono text-[10px]">Ctrl+I</kbd>
            ），在输入框输入 <code className="font-mono">#句柄</code>
          </li>
          <li>继续写你的问题，发送 — 片段内容会自动附在这条消息里</li>
        </ol>
        <div className="mt-2.5 rounded-md border border-border/25 bg-background/50 px-2.5 py-2">
          <span className="text-[9.5px] uppercase tracking-wide text-muted-foreground">
            示例输入
          </span>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-foreground/85">
            请 <span className="rounded bg-primary/15 px-1 text-primary">#commit</span>{" "}
            帮我写这次改动的提交说明
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] font-medium text-muted-foreground">
          示例模板（点击添加，可再编辑）
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SNIPPET_PRESETS.map((preset) => {
            const taken = usedHandles.has(preset.handle);
            return (
              <button
                key={preset.handle}
                type="button"
                disabled={taken}
                onClick={() => onAddPreset(preset)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  taken
                    ? "cursor-not-allowed border-border/20 bg-muted/10 opacity-50"
                    : "border-border/30 bg-card/40 hover:border-border hover:bg-card/70",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <code className="rounded bg-muted/50 px-1 font-mono text-[10px] text-muted-foreground">
                    #{preset.handle}
                  </code>
                  <span className="truncate text-[11.5px] font-medium">
                    {preset.name}
                  </span>
                </span>
                <span className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                  {preset.description}
                </span>
                <span className="text-[9.5px] text-muted-foreground/80">
                  {taken ? "已添加" : "点击添加 →"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {snippets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/30 bg-card/20 px-4 py-5 text-center text-[11px] text-muted-foreground">
          还没有自定义片段。从上方示例添加，或点「新建片段」自己写。
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-medium text-muted-foreground">
            我的片段（{snippets.length}）
          </span>
          {snippets.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-2"
            >
              <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                #{s.handle}
              </code>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[12px] font-medium">{s.name}</span>
                {s.description ? (
                  <span className="truncate text-[10.5px] text-muted-foreground">
                    {s.description}
                  </span>
                ) : null}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => onEdit(s)}
                title="编辑"
              >
                <HugeiconsIcon icon={Edit02Icon} size={12} strokeWidth={1.75} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(s.id)}
                title="删除"
              >
                <HugeiconsIcon icon={Delete02Icon} size={12} strokeWidth={1.75} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AgentCard({
  agent,
  active,
  onActivate,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  active: boolean;
  onActivate: () => void;
  onEdit: (() => void) | null;
  onDelete: (() => void) | null;
}) {
  const Icon = AGENT_ICONS[agent.icon] ?? SparklesIcon;
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border bg-card/60 px-3 py-2.5 transition-colors",
        active
          ? "border-foreground/30 ring-1 ring-foreground/10"
          : "border-border/30 hover:border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/40">
          <HugeiconsIcon icon={Icon} size={14} strokeWidth={1.5} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
            {agent.name}
            {agent.builtIn ? (
              <span className="rounded bg-muted/50 px-1 py-0.5 text-[9px] tracking-wide text-muted-foreground uppercase">
                内置
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
            {agent.description}
          </span>
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <Button
          size="sm"
          variant={active ? "default" : "outline"}
          onClick={onActivate}
          className="h-6 gap-1 px-2 text-[10.5px]"
        >
          {active ? (
            <>
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={10}
                strokeWidth={2}
              />
              使用中
            </>
          ) : (
            "使用此 Agent"
          )}
        </Button>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6"
              onClick={onEdit}
              title="编辑"
            >
              <HugeiconsIcon icon={Edit02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="删除"
            >
              <HugeiconsIcon icon={Delete02Icon} size={11} strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgentEditorDialog({
  agent,
  existing,
  onClose,
  onSave,
}: {
  agent: Agent | null;
  existing: Agent[];
  onClose: () => void;
  onSave: (a: Agent) => void;
}) {
  const [draft, setDraft] = useState<Agent | null>(agent);
  useEffect(() => setDraft(agent), [agent]);
  if (!draft) return null;

  const isNew = !existing.some((a) => a.id === draft.id);
  const canSave =
    draft.name.trim().length > 0 && draft.instructions.trim().length > 0;

  return (
    <Dialog open={!!agent} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[13px]">
            {isNew ? "新建 Agent" : "编辑 Agent"}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <Label>图标</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map((id) => {
                  const Icon = AGENT_ICONS[id] ?? SparklesIcon;
                  const active = draft.icon === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDraft({ ...draft, icon: id })}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-foreground/40 bg-accent"
                          : "border-border/30 hover:bg-accent/40",
                      )}
                    >
                      <HugeiconsIcon icon={Icon} size={13} strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>名称</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-8 text-[12px]"
                placeholder="如：测试工程师"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>描述</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="一行描述，显示在 Agent 选择器中"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>指令</Label>
            <Textarea
              value={draft.instructions}
              onChange={(e) =>
                setDraft({ ...draft, instructions: e.target.value })
              }
              placeholder="人设与规则。会追加到灵码ADE 核心系统提示词后面。"
              className="min-h-40 resize-y text-[12px] leading-relaxed"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => onSave({ ...draft, builtIn: false })}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SnippetEditorDialog({
  snippet,
  existing,
  onClose,
  onSave,
}: {
  snippet: Snippet | null;
  existing: Snippet[];
  onClose: () => void;
  onSave: (s: Snippet) => void;
}) {
  const [draft, setDraft] = useState<Snippet | null>(snippet);
  useEffect(() => setDraft(snippet), [snippet]);
  if (!draft) return null;

  const handleErr = !draft.handle
    ? "必填。"
    : !isValidHandle(draft.handle)
      ? "仅限小写字母、数字和连字符。"
      : existing.some((s) => s.id !== draft.id && s.handle === draft.handle)
        ? "已被占用。"
        : null;
  const canSave =
    !handleErr &&
    draft.name.trim().length > 0 &&
    draft.content.trim().length > 0;

  const isNew = !existing.some((s) => s.id === draft.id);

  return (
    <Dialog open={!!snippet} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[13px]">
            {isNew ? "新建片段" : "编辑片段"}
          </DialogTitle>
        </DialogHeader>
        <div className="-mx-2 max-h-[calc(100vh-14rem)] overflow-y-auto px-2 flex flex-col gap-3">
          {isNew ? (
            <p className="rounded-md border border-border/25 bg-muted/20 px-2.5 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
              片段 = 可反复使用的提示词。保存后在 AI 输入框输入{" "}
              <code className="font-mono text-foreground/80">#句柄</code>{" "}
              即可插入，仅对当前这条消息生效。
            </p>
          ) : null}
          <div className="flex gap-2">
            <div className="flex w-32 flex-col gap-1">
              <Label>句柄</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-2 -translate-y-1/2 font-mono text-[11.5px] text-muted-foreground">
                  #
                </span>
                <Input
                  value={draft.handle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      handle: normalizeHandle(e.target.value),
                    })
                  }
                  placeholder="commit"
                  className="h-8 pl-5 font-mono text-[11.5px]"
                />
              </div>
              {handleErr ? (
                <span className="text-[10px] text-destructive">{handleErr}</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  输入框里写 #{draft.handle || "句柄"}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label>名称</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="如：合并前审查清单"
                className="h-8 text-[12px]"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>描述</Label>
            <Input
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="一行描述 — 显示在 # 选择器中"
              className="h-8 text-[12px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>内容</Label>
            <Textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder={`写你希望 AI 执行的指令，例如：\n\n请根据 git 暂存区变更，生成 Conventional Commits 格式的 commit message。`}
              className="min-h-40 resize-y font-mono text-[11.5px] leading-relaxed"
            />
            {draft.handle && draft.content.trim() ? (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                发送时，输入{" "}
                <code className="font-mono">#{draft.handle}</code>{" "}
                会把上方内容作为{" "}
                <code className="font-mono">&lt;snippet&gt;</code>{" "}
                附在这条消息前面。
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" disabled={!canSave} onClick={() => onSave(draft)}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomInstructionsBlock({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const hadFirstSync = useRef(false);
  const dirty = draft !== value;

  useEffect(() => {
    if (!hadFirstSync.current) {
      hadFirstSync.current = true;
      setDraft(value);
    }
  }, [value]);

  const handleSave = async () => {
    await setCustomInstructions(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Label>自定义指令</Label>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            写入你希望 AI
            <span className="font-medium text-foreground/80">始终遵守</span>
            的全局规则。保存后对 AI 面板的所有对话生效，与当前选中的 Agent
            叠加使用。
          </p>
        </div>
        <Button
          size="xs"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty}
          onClick={() => void handleSave()}
        >
          {saved ? "已保存" : "保存"}
        </Button>
      </div>

      <div className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
        <p className="text-[10.5px] font-medium text-foreground/80">
          与 Agent、片段的区别
        </p>
        <ul className="mt-1.5 space-y-1 text-[10.5px] leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-foreground/75">自定义指令</span>
            ：全局偏好（语言、工具链、团队规范），一直有效
          </li>
          <li>
            <span className="font-medium text-foreground/75">Agent</span>
            ：切换工作角色（编码、审查、安全…）
          </li>
          <li>
            <span className="font-medium text-foreground/75">片段</span>
            ：单条消息里用 <code className="font-mono">#句柄</code> 插入模板
          </li>
        </ul>
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={CUSTOM_INSTRUCTIONS_PLACEHOLDER}
        className="min-h-[140px] resize-y bg-card/60 font-sans text-[12px] leading-relaxed border border-border"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] text-muted-foreground">
          快速填入示例（点击追加到输入框，可删改后保存）
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CUSTOM_INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                setDraft((prev) =>
                  prev.trim()
                    ? `${prev.trim()}\n${preset.content}`
                    : preset.content,
                )
              }
              className="rounded-md border border-border/30 bg-card/50 px-2 py-1 text-[10.5px] text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CUSTOM_INSTRUCTIONS_PLACEHOLDER = `在此写入全局规则，保存后对 AI 面板的所有对话生效。

写法建议：每条一行，用「•」或「-」开头。

示例：
• 始终用中文回复
• Node 项目只用 pnpm，不用 npm / yarn
• 修改 Rust 代码后运行 cargo clippy
• 回答简洁，先给结论再展开
• 不要主动创建 git commit，除非我明确要求`;

const CUSTOM_INSTRUCTION_PRESETS = [
  {
    label: "中文 + 工具链",
    content:
      "• 始终用中文回复\n• Node 项目只用 pnpm\n• 改 Rust 前先 cargo clippy",
  },
  {
    label: "简洁回复",
    content: "• 回答尽量简短，直接给结论和代码\n• 非必要不解释基础概念",
  },
  {
    label: "谨慎改动",
    content:
      "• 改动范围尽量小，不顺手重构无关代码\n• 写入/删除文件前先说明原因",
  },
] as const;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
