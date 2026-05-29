import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import { motion } from "motion/react";
import { useEffect } from "react";

export type SelectionAskAiProps = {
  x: number;
  y: number;
  onAsk: () => void;
  onDismiss: () => void;
};

const W = 178;
const H = 30;
const GAP = 8;
const MARGIN = 8;

export function SelectionAskAi({ x, y, onAsk, onDismiss }: SelectionAskAiProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const top = Math.max(MARGIN, y - H - GAP);
  const left = Math.max(MARGIN, Math.min(x - W / 2, window.innerWidth - W - MARGIN));

  return (
    <motion.div
      data-selection-ask-ai
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{ top, left, width: W }}
      className="fixed z-50"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAsk();
        }}
        className="flex h-[30px] w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-card/95 px-2.5 text-xs whitespace-nowrap shadow-lg backdrop-blur-md hover:border-border hover:bg-accent"
      >
        <span className="shrink-0">向灵码ADE 提问</span>
        <KbdGroup className="shrink-0">
          <Kbd className="h-4 min-w-4 px-1 text-[10px]">{fmtShortcut(MOD_KEY, "L")}</Kbd>
        </KbdGroup>
      </button>
    </motion.div>
  );
}
