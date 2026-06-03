import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import { motion } from "motion/react";
import { useEffect } from "react";

export type SelectionAskAiAlign = "center" | "right";

export type SelectionAskAiProps = {
  x: number;
  y: number;
  align?: SelectionAskAiAlign;
  onAsk: () => void;
  onDismiss: () => void;
};

const W = 248;
const H = 38;
const GAP = 10;
const MARGIN = 12;
const EDITOR_INSET = 16;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

export function SelectionAskAi({
  x,
  y,
  align = "right",
  onAsk,
  onDismiss,
}: SelectionAskAiProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const top = clamp(y, MARGIN, window.innerHeight - H - MARGIN);
  const left =
    align === "right"
      ? clamp(x - W - EDITOR_INSET, MARGIN, window.innerWidth - W - MARGIN)
      : clamp(x - W / 2, MARGIN, window.innerWidth - W - MARGIN);

  return (
    <motion.div
      data-selection-ask-ai
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ top: top - GAP, left, width: W }}
      className="fixed z-50 -translate-y-full"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAsk();
        }}
        className="flex h-[38px] w-full items-center justify-between gap-3 rounded-full border border-border/60 bg-card/95 px-4 text-sm font-medium whitespace-nowrap shadow-lg backdrop-blur-md hover:border-border hover:bg-accent"
      >
        <span className="shrink-0">向灵码ADE 提问</span>
        <KbdGroup className="shrink-0">
          <Kbd className="h-5 min-w-5 px-1.5 text-[11px]">
            {fmtShortcut(MOD_KEY, "L")}
          </Kbd>
        </KbdGroup>
      </button>
    </motion.div>
  );
}
