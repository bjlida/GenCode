import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SettingRow({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-6 border-b border-border/35 py-3.5 last:border-b-0",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-medium leading-snug">{title}</span>
        {description ? (
          <span className="text-[11.5px] leading-relaxed text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}
