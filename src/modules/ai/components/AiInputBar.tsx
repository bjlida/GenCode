import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Cancel01Icon,
  CodeIcon,
  HashtagIcon,
  Key01Icon,
  TerminalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useComposer, type FileAttachment } from "../lib/composer";
import { useWorkspaceFiles } from "../hooks/useWorkspaceFiles";
import { SLASH_COMMANDS } from "../lib/slashCommands";
import { CC_SLASH_COMMANDS } from "@/modules/claude-code/lib/commands";
import type { Snippet } from "../lib/snippets";
import { useChatStore } from "../store/chatStore";
import { useSnippetsStore } from "../store/snippetsStore";
import {
  AiComposerActions,
  ModelDropdown,
} from "./AiStatusBarControls";
import { AgentSwitcher } from "./AgentSwitcher";
import { FilePickerContent } from "./FilePicker";
import { SnippetPickerContent, type PickerItem } from "./SnippetPicker";

type SnippetTrigger = {
  start: number;
  end: number;
  query: string;
  lead: "#" | "/";
};

type FileTrigger = {
  start: number;
  end: number;
  query: string;
};

function detectSnippetTrigger(
  value: string,
  caret: number,
): SnippetTrigger | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === "#" || ch === "/") {
      const prev = i === 0 ? " " : value[i - 1];
      if (!/\s/.test(prev)) return null;
      const slice = value.slice(i + 1, caret);
      if (!/^[a-z0-9-]*$/i.test(slice)) return null;
      return { start: i, end: caret, query: slice.toLowerCase(), lead: ch };
    }
    if (/\s/.test(ch)) return null;
    if (!/[a-z0-9-]/i.test(ch)) return null;
  }
  return null;
}

function detectFileTrigger(
  value: string,
  caret: number,
): FileTrigger | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === "@") {
      const prev = i === 0 ? " " : value[i - 1];
      if (!/\s/.test(prev)) return null;
      const slice = value.slice(i + 1, caret);
      return { start: i, end: caret, query: slice };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

export function AiInputBar({ embedded = false }: { embedded?: boolean }) {
  const c = useComposer();
  const snippets = useSnippetsStore((s) => s.snippets);
  const workspaceRoot = useChatStore((s) => s.live.getWorkspaceRoot());

  const [trigger, setTrigger] = useState<SnippetTrigger | null>(null);
  const [fileTrigger, setFileTrigger] = useState<FileTrigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const workspaceFiles = useWorkspaceFiles(workspaceRoot, fileTrigger !== null);

  const [fileQuery, setFileQuery] = useState("");
  useEffect(() => {
    if (!fileTrigger) {
      setFileQuery("");
      return;
    }
    const q = fileTrigger.query;
    const t = window.setTimeout(() => setFileQuery(q), 50);
    return () => window.clearTimeout(t);
  }, [fileTrigger]);

  useEffect(() => {
    autoresize(c.textareaRef.current);
  }, [c.value, c.textareaRef]);

  const updateTrigger = () => {
    const el = c.textareaRef.current;
    if (!el) {
      setTrigger(null);
      setFileTrigger(null);
      return;
    }
    const caret = el.selectionStart ?? 0;
    setTrigger(detectSnippetTrigger(c.value, caret));
    setFileTrigger(detectFileTrigger(c.value, caret));
  };

  useEffect(updateTrigger, [c.value, c.textareaRef]);

  const filteredItems = useMemo<PickerItem[]>(() => {
    if (!trigger) return [];
    const q = trigger.query;
    const aiCmdItems: PickerItem[] = Object.values(SLASH_COMMANDS)
      .filter(
        (c) =>
          !q ||
          c.name.includes(q) ||
          c.label.includes(q) ||
          c.description.includes(q),
      )
      .map((command) => ({ kind: "command", command }));
    const ccCmdItems: PickerItem[] = CC_SLASH_COMMANDS.filter(
      (c) =>
        !q ||
        c.name.includes(q) ||
        c.label.includes(q) ||
        c.description.includes(q),
    ).map((command) => ({ kind: "command", command }));
    const snipItems: PickerItem[] = snippets
      .filter(
        (s) =>
          !q ||
          s.handle.includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
      .map((snippet) => ({ kind: "snippet", snippet }));
    return [...aiCmdItems, ...ccCmdItems, ...snipItems];
  }, [trigger, snippets]);

  const FILE_PICKER_CAP = 30;
  const filteredFiles = useMemo<string[]>(() => {
    if (!fileTrigger) return [];
    const q = fileQuery.toLowerCase();
    if (!q) return workspaceFiles.files.slice(0, FILE_PICKER_CAP);
    const out: string[] = [];
    for (const f of workspaceFiles.files) {
      if (f.toLowerCase().includes(q)) {
        out.push(f);
        if (out.length >= FILE_PICKER_CAP) break;
      }
    }
    return out;
  }, [fileTrigger, fileQuery, workspaceFiles.files]);

  const fileTriggerOpen = fileTrigger !== null;
  const snippetTriggerOpen = trigger !== null;
  useEffect(() => {
    setActiveIndex(0);
  }, [snippetTriggerOpen, fileTriggerOpen, fileQuery]);

  const pickerOpen = trigger !== null || fileTrigger !== null;

  const onPickItem = (item: PickerItem) => {
    if (!trigger) return;
    const before = c.value.slice(0, trigger.start);
    const afterRaw = c.value.slice(trigger.end);
    const prefix = trigger.lead;
    let insert = "";
    if (item.kind === "snippet") {
      const needsSpace = afterRaw.length === 0 || !/^\s/.test(afterRaw);
      insert = `#${item.snippet.handle}${needsSpace ? " " : ""}`;
      c.addSnippet(item.snippet);
    } else {
      c.addCommand(item.command);
      if (item.command.source === "cc") {
        // CC commands route through the AI as Claude Code directives.
        insert = `/claude-code ${item.command.invocation} `;
      } else {
        insert = `${prefix}${item.command.name} `;
      }
    }
    const after =
      item.kind === "command" ? afterRaw.replace(/^\s+/, "") : afterRaw;
    c.setValue(`${before}${insert}${after}`);
    setTrigger(null);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      const el = c.textareaRef.current;
      if (!el) return;
      const caret = before.length + insert.length;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const onPickFile = async (filePath: string) => {
    if (!fileTrigger || !workspaceRoot) return;
    const before = c.value.slice(0, fileTrigger.start);
    const after = c.value.slice(fileTrigger.end);
    c.setValue(`${before}${after}`);
    setFileTrigger(null);
    setActiveIndex(0);
    const fullPath = workspaceRoot.endsWith("/")
      ? `${workspaceRoot}${filePath}`
      : `${workspaceRoot}/${filePath}`;
    await c.attachFileByPath(fullPath);
    requestAnimationFrame(() => {
      const el = c.textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const pickActive = () => {
    if (fileTrigger) {
      const file = filteredFiles[activeIndex];
      if (file) void onPickFile(file);
      return;
    }
    const it = filteredItems[activeIndex];
    if (it) onPickItem(it);
  };

  const voiceLabel = c.voice.recording
    ? c.voice.liveTranscript || "正在聆听…"
    : c.voice.transcribing
      ? "正在转录…"
      : null;

  const [dragOver, setDragOver] = useState(false);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const dt = e.clipboardData;
      if (!dt) return;
      const hasImage =
        Array.from(dt.items).some(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        ) ||
        Array.from(dt.files).some((f) => f.type.startsWith("image/"));
      if (!hasImage) return;
      e.preventDefault();
      void c.addFilesFromDataTransfer(dt);
    },
    [c],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (c.isBusy) return;
      void c.addFilesFromDataTransfer(e.dataTransfer);
    },
    [c],
  );

  return (
    <div
      className={cn(
        "shrink-0",
        embedded ? "bg-transparent px-3 pb-3 pt-2" : "bg-card/40 px-3 py-3",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 rounded-2xl border border-border/70 bg-background p-3 shadow-sm",
          "transition-[border-color,box-shadow] focus-within:border-border focus-within:shadow-md",
          "focus-within:ring-1 focus-within:ring-ring/15",
          dragOver && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!c.isBusy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <ChipsRow
          files={c.files}
          onRemoveFile={c.removeFile}
          snippets={c.pickedSnippets}
          onRemoveSnippet={(id) => {
            const snip = c.pickedSnippets.find((s) => s.id === id);
            c.removeSnippet(id);
            if (!snip) return;
            const re = new RegExp(`(^|\\s)#${snip.handle}\\b ?`);
            c.setValue((v) => v.replace(re, (_m, lead: string) => lead));
          }}
          commands={c.pickedCommands}
          onRemoveCommand={(name) => c.removeCommand(name)}
        />

        <Popover open={pickerOpen}>
          <PopoverAnchor asChild>
            <textarea
              ref={c.textareaRef}
              value={c.value}
              onChange={(e) => c.setValue(e.target.value)}
              onPaste={handlePaste}
              onKeyUp={updateTrigger}
              onClick={updateTrigger}
              onSelect={updateTrigger}
              onKeyDown={(e) => {
                if (pickerOpen) {
                  const items = fileTrigger ? filteredFiles : filteredItems;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) =>
                      Math.min(i + 1, Math.max(0, items.length - 1)),
                    );
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(0, i - 1));
                    return;
                  }
                  if (e.key === "Tab" || e.key === "Enter") {
                    if (items.length > 0) {
                      e.preventDefault();
                      pickActive();
                      return;
                    }
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (fileTrigger) {
                      const before = c.value.slice(0, fileTrigger.start);
                      const after = c.value.slice(fileTrigger.end);
                      c.setValue(`${before}${after}`);
                      setFileTrigger(null);
                    } else {
                      setTrigger(null);
                    }
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  c.submit();
                }
              }}
              placeholder="规划、构建，/ Agent，@ 上下文，拖放或粘贴截图"
              rows={1}
              className={cn(
                "min-h-[2.75rem] w-full max-h-40 resize-none bg-transparent text-[13px] leading-relaxed outline-none",
                "placeholder:text-muted-foreground/55",
              )}
            />
          </PopoverAnchor>
          {fileTrigger ? (
            <FilePickerContent
              files={filteredFiles}
              activeIndex={activeIndex}
              indexing={workspaceFiles.indexing}
              truncated={workspaceFiles.truncated}
              hasWorkspace={workspaceRoot !== null}
              onPick={(f) => void onPickFile(f)}
              onHover={setActiveIndex}
            />
          ) : (
            <SnippetPickerContent
              items={filteredItems}
              activeIndex={activeIndex}
              onPick={onPickItem}
              onHover={setActiveIndex}
              lead={trigger?.lead}
            />
          )}
        </Popover>

        <AnimatePresence initial={false}>
          {voiceLabel && (
            <motion.div
              key={voiceLabel}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-1.5 text-[13px] text-muted-foreground"
            >
              {c.voice.recording ? (
                <span className="size-1.5 animate-pulse rounded-full bg-destructive" />
              ) : (
                <Spinner className="size-3" />
              )}
              <span className="truncate">{voiceLabel}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <AgentSwitcher variant="composer" />
            <ModelDropdown composer />
          </div>
          <AiComposerActions composer />
        </div>
      </div>
    </div>
  );
}

function ChipsRow({
  files,
  onRemoveFile,
  snippets,
  onRemoveSnippet,
  commands,
  onRemoveCommand,
}: {
  files: FileAttachment[];
  onRemoveFile: (id: string) => void;
  snippets: Snippet[];
  onRemoveSnippet: (id: string) => void;
  commands: { name: string; label: string; icon: typeof HashtagIcon }[];
  onRemoveCommand: (name: string) => void;
}) {
  if (files.length === 0 && snippets.length === 0 && commands.length === 0)
    return null;
  return (
    <div className="flex flex-wrap gap-1">
      <AnimatePresence initial={false}>
        {commands.map((cmd) => (
          <motion.div
            key={`cmd-${cmd.name}`}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="group flex items-center gap-1 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[13px]"
            title={cmd.label}
          >
            <HugeiconsIcon
              icon={cmd.icon}
              size={11}
              strokeWidth={1.75}
              className="text-muted-foreground"
            />
            <span className="font-medium">#{cmd.name}</span>
            <button
              type="button"
              onClick={() => onRemoveCommand(cmd.name)}
              className="ml-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="移除命令"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
            </button>
          </motion.div>
        ))}
        {snippets.map((s) => (
          <motion.div
            key={`snip-${s.id}`}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="group flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[13px] text-primary"
            title={s.description || s.name}
          >
            <HugeiconsIcon
              icon={HashtagIcon}
              size={11}
              strokeWidth={2}
              className="opacity-80"
            />
            <span className="font-medium">{s.handle}</span>
            <button
              type="button"
              onClick={() => onRemoveSnippet(s.id)}
              className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="移除片段"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
            </button>
          </motion.div>
        ))}
        {files.map((f) => (
          <motion.div
            key={f.id}
            layout
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            className="group flex items-center gap-1 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[13px]"
          >
            {f.kind === "image" && f.url ? (
              <img src={f.url} alt="" className="size-4 rounded object-cover" />
            ) : f.kind === "selection" ? (
              <HugeiconsIcon
                icon={f.source === "editor" ? CodeIcon : TerminalIcon}
                size={11}
                strokeWidth={1.75}
                className="text-muted-foreground"
              />
            ) : (
              <span className="font-mono text-[13px] text-muted-foreground">
                {extOf(f.name)}
              </span>
            )}
            <span className="max-w-35 truncate">
              {f.name}
              {f.kind === "selection" && f.text ? (
                <span className="ml-1 text-muted-foreground">
                  · {selLineCount(f.text)}L
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => onRemoveFile(f.id)}
              className="ml-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="移除"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function selLineCount(text: string): number {
  if (!text) return 0;
  const trimmed = text.replace(/\n+$/, "");
  if (!trimmed) return 0;
  return trimmed.split("\n").length;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "文件" : name.slice(i + 1).toUpperCase();
}

function autoresize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

export type AiInputBarProps = { tabId: number };

export function AiInputBarConnect({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="shrink-0 border-t border-border/60 bg-card/40 px-3 py-2">
      <div className="flex h-10 items-center justify-between gap-3 rounded-lg px-3 text-xs">
        <span className="text-muted-foreground">
          连接任意 AI 服务商（或使用本地模型）— 密钥存储在您的系统密钥链中。
          OS keychain.
        </span>
        <Button size="xs" onClick={onAdd}>
          <HugeiconsIcon icon={Key01Icon} />
          连接服务商
        </Button>
      </div>
    </div>
  );
}
