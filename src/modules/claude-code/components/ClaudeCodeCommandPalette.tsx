import { useState, useMemo } from "react";
import { CC_COMMANDS, searchCommands, CATEGORY_LABELS } from "../lib/commands";
import { ClaudeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface Props {
  onClose: () => void;
}

export function ClaudeCodeCommandPalette({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    if (!query.trim()) return CC_COMMANDS;
    return searchCommands(query);
  }, [query]);

  const selected = results[selectedIndex] ?? null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div className="flex flex-col max-h-96">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <HugeiconsIcon icon={ClaudeIcon} size={14} strokeWidth={1.75} />
        <span className="text-[13px] font-semibold">
          Claude Code 命令参考
        </span>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {results.length} 个命令
        </span>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="搜索命令..."
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] font-mono outline-none"
          autoFocus
        />
      </div>

      {/* Command list */}
      <div className="overflow-y-auto px-2 pb-2 flex-1 min-h-0">
        {results.length === 0 ? (
          <p className="px-2 py-4 text-[13px] text-muted-foreground text-center">
            无匹配命令
          </p>
        ) : (
          results.map((cmd, i) => (
            <button
              key={cmd.command}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                i === selectedIndex
                  ? "bg-accent/60"
                  : "hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <code className="text-[13px] font-mono font-medium shrink-0">
                  {cmd.command}
                </code>
                <span className="text-[13px] font-medium">
                  {cmd.zhName}
                </span>
                {cmd.syntax !== cmd.command && (
                  <code className="text-[11px] font-mono text-muted-foreground/70 hidden sm:inline truncate">
                    {cmd.syntax}
                  </code>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                {cmd.zhDescription}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-border/60 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>↑↓ 导航</span>
        <span>Esc 关闭</span>
        <span className="ml-auto">
          {CATEGORY_LABELS[selected?.category ?? ""] ?? ""}
        </span>
      </div>
    </div>
  );
}
