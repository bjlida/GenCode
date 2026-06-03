import { cn } from "@/lib/utils";
import { FolderGitTwoIcon, FolderTreeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SidebarViewId } from "./types";

export const SIDEBAR_RAIL_HEIGHT = 36;

type RailItem = {
  id: SidebarViewId;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: number;
};

type Props = {
  activeView: SidebarViewId;
  onSelectView: (view: SidebarViewId) => void;
  changedCount: number;
};

export function SidebarRail({ activeView, onSelectView, changedCount }: Props) {
  const items: RailItem[] = [
    { id: "explorer", label: "文件", icon: FolderTreeIcon },
    {
      id: "source-control",
      label: "源码管理",
      icon: FolderGitTwoIcon,
      badge: changedCount,
    },
  ];

  return (
    <div
      style={{ height: SIDEBAR_RAIL_HEIGHT }}
      className="flex shrink-0 items-stretch gap-0.5 border-t border-border/60 bg-card/85 px-1 py-0.5 backdrop-blur"
    >
      {items.map((item) => {
        const isActive = item.id === activeView;
        const showBadge = !!item.badge && item.badge > 0;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={isActive}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "group relative flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md text-[13px] outline-none transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? "bg-foreground/[0.07] font-medium text-foreground dark:bg-foreground/[0.09]"
                : "font-normal text-muted-foreground hover:bg-foreground/[0.045] hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={isActive ? 2 : 1.75}
              className="shrink-0 transition-[stroke-width] duration-150"
            />
            <span>{item.label}</span>
            {showBadge ? (
              <span className="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-border/60 bg-card px-0.5 text-[10px] font-semibold leading-none tabular-nums text-muted-foreground/95">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
