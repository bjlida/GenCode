import { useEffect } from "react";
import { useClaudeCodeStore, fetchRuntimeStatus } from "@/modules/claude-code";
import { useChatStore } from "@/modules/ai";
import { ClaudeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openSettingsWindow } from "@/modules/settings/openSettingsWindow";

export function ClaudeCodeStatus() {
  const status = useClaudeCodeStore((s) => s.runtimeStatus);
  const setStatus = useClaudeCodeStore((s) => s.setRuntimeStatus);
  const openClaudeCodeTerminal = useChatStore(
    (s) => s.live.openClaudeCodeTerminal,
  );

  useEffect(() => {
    void fetchRuntimeStatus().then(setStatus);
  }, [setStatus]);

  if (!status) return null;

  const handleClick = () => {
    if (!status.installed) {
      void openSettingsWindow("claude-code");
      return;
    }
    openClaudeCodeTerminal();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={
        status.installed
          ? `新建 Claude 终端${status.version ? ` (${status.version})` : ""}`
          : "Claude Code 未安装 — 点击设置"
      }
      className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] transition-colors ${
        status.installed
          ? "text-muted-foreground hover:text-foreground"
          : "text-amber-600 dark:text-amber-400 hover:text-amber-700"
      }`}
    >
      <HugeiconsIcon icon={ClaudeIcon} size={12} strokeWidth={1.75} />
      <span className="hidden @lg:inline">
        {status.installed ? "CC" : "CC 未安装"}
      </span>
    </button>
  );
}
