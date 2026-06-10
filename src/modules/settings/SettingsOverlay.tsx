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
          className="absolute inset-0 z-50 flex bg-background/98 backdrop-blur-md"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-header items-center justify-end px-4">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="pointer-events-auto size-7 rounded-lg"
              onClick={closeSettings}
              aria-label="关闭设置"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.75} />
            </Button>
          </div>

          <aside className="flex w-56 shrink-0 flex-col border-r border-border/40 bg-muted/25">
            <div className="flex h-header shrink-0 items-center px-4">
              <span className="text-[13px] font-semibold tracking-tight">设置</span>
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
              {SETTINGS_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                    tab === t.id
                      ? "bg-accent font-medium text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={t.icon} size={15} strokeWidth={1.75} />
                  {t.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto bg-background/50 px-6 py-6 sm:px-10 md:px-14 lg:px-20 xl:px-28">
            <div className="mx-auto w-full max-w-3xl xl:max-w-4xl">
              {ActiveSection ? <ActiveSection /> : null}
            </div>
          </main>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
