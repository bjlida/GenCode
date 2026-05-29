import { useClaudeCodeStore, killSession } from "@/modules/claude-code";
import { ClaudeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function ClaudeCodeSessionPanel() {
  const sessions = useClaudeCodeStore((s) => s.sessions);
  const updateSession = useClaudeCodeStore((s) => s.updateSession);
  const removeSession = useClaudeCodeStore((s) => s.removeSession);

  if (sessions.length === 0) return null;

  const handleKill = async (id: number) => {
    try {
      await killSession(id);
      removeSession(id);
    } catch {
      updateSession(id, { status: "exited" });
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "spawning": return "启动中";
      case "working": return "工作中";
      case "attention": return "需要关注";
      case "finished": return "已完成";
      case "exited": return "已退出";
      default: return status;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((ses) => (
        <div
          key={ses.id}
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
        >
          <HugeiconsIcon
            icon={ClaudeIcon}
            size={12}
            strokeWidth={1.75}
            className="text-muted-foreground shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] truncate">
              {ses.prompt.length > 40
                ? `${ses.prompt.slice(0, 40)}…`
                : ses.prompt}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {statusLabel(ses.status)}
            </p>
          </div>
          {ses.status === "finished" || ses.status === "exited" ? (
            <button
              type="button"
              onClick={() => removeSession(ses.id)}
              className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
            >
              清除
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleKill(ses.id)}
              className="text-[11px] text-destructive hover:underline shrink-0"
            >
              停止
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
