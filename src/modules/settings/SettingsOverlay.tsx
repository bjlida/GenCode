import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { SETTINGS_TABS } from "./settingsTabs";
import { useSettingsOverlayStore } from "./settingsOverlayStore";

export function SettingsOverlay() {
  const open = useSettingsOverlayStore((s) => s.open);
  const tab = useSettingsOverlayStore((s) => s.tab);
  const setTab = useSettingsOverlayStore((s) => s.setTab);
  const closeSettings = useSettingsOverlayStore((s) => s.closeSettings);
  const init = usePreferencesStore((s) => s.init);

  useEffect(() => {
    if (open) void init();
  }, [open, init]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        closeSettings();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeSettings]);

  const ActiveSection = SETTINGS_TABS.find((t) => t.id === tab)?.component;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex bg-background/95 backdrop-blur-sm"
        >
          <aside className="flex w-52 shrink-0 flex-col border-r border-border/60 bg-card/80">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/50 px-3">
              <span className="text-[13px] font-semibold">设置</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={closeSettings}
                aria-label="关闭设置"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.75} />
              </Button>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
              {SETTINGS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
                    tab === t.id
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={t.icon} size={14} strokeWidth={1.75} />
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto w-full max-w-160">
              {ActiveSection ? <ActiveSection /> : null}
            </div>
          </main>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
