import { useState } from "react";
import { useClaudeCodeStore, spawnClaudeCode } from "@/modules/claude-code";
import { ClaudeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface Props {
  workspaceRoot: string;
  cwd: string | null;
  onSpawned?: (sessionId: number) => void;
  onClose: () => void;
}

export function ClaudeCodeLauncher({ workspaceRoot, cwd, onSpawned, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [spawning, setSpawning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addSession = useClaudeCodeStore((s) => s.addSession);
  const updateSession = useClaudeCodeStore((s) => s.updateSession);

  const handleSpawn = async () => {
    const oneLine = prompt.trim();
    if (!oneLine) return;
    setSpawning(true);
    setError(null);
    let sessionId = 0;
    try {
      sessionId = await spawnClaudeCode({
        prompt: oneLine,
        cwd: cwd ?? undefined,
        workspaceRoot,
        cols: 120,
        rows: 30,
        onExit: (_code) => {
          updateSession(sessionId, { status: "exited" });
        },
      });
      addSession({
        id: sessionId,
        prompt: oneLine,
        status: "spawning",
        startedAt: Date.now(),
      });
      onSpawned?.(sessionId);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSpawning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={ClaudeIcon} size={16} strokeWidth={1.75} />
        <span className="text-[15px] font-semibold">启动 Claude Code Agent</span>
      </div>

      <div>
        <label className="text-[13px] text-muted-foreground">
          描述您想要完成的任务
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSpawn();
            }
          }}
          placeholder="例如：修复 src/auth.ts 中的登录逻辑 bug"
          rows={3}
          className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[14px] font-mono outline-none placeholder:text-muted-foreground/60"
          autoFocus
        />
      </div>

      {error && (
        <p className="text-[12px] text-destructive font-mono break-all">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSpawn}
          disabled={!prompt.trim() || spawning}
          className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {spawning ? "启动中…" : "启动"}
        </button>
      </div>
    </div>
  );
}
