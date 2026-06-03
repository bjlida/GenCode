import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsCard({ title, description, children, className }: Props) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/40 px-4 py-3">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col px-4">{children}</div>
    </section>
  );
}
