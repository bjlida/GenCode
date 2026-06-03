import { USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { cn } from "@/lib/utils";
import {
  Cancel01Icon,
  Copy01Icon,
  MinusSignIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

type Props = {
  /** Render only the close button (used by the settings window). */
  closeOnly?: boolean;
};

export function WindowControls({ closeOnly = false }: Props) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!USE_CUSTOM_WINDOW_CONTROLS || closeOnly) return;
    const w = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void w.isMaximized().then(setMaximized);
    void w
      .onResized(() => {
        void w.isMaximized().then(setMaximized);
      })
      .then((un) => {
        unlisten = un;
      });
    return () => unlisten?.();
  }, [closeOnly]);

  if (!USE_CUSTOM_WINDOW_CONTROLS) return null;

  const w = getCurrentWindow();

  return (
    <div className="flex h-full shrink-0 items-center gap-0.5 pr-2">
      {!closeOnly && (
        <>
          <CtlButton ariaLabel="最小化" onClick={() => void w.minimize()}>
            <HugeiconsIcon icon={MinusSignIcon} size={17} strokeWidth={2} />
          </CtlButton>
          <CtlButton
            ariaLabel={maximized ? "还原" : "最大化"}
            onClick={() => void w.toggleMaximize()}
          >
            <HugeiconsIcon
              icon={maximized ? Copy01Icon : SquareIcon}
              size={17}
              strokeWidth={2}
            />
          </CtlButton>
        </>
      )}
      <CtlButton ariaLabel="关闭" onClick={() => void w.close()} danger>
        <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
      </CtlButton>
    </div>
  );
}

function CtlButton({
  ariaLabel,
  onClick,
  children,
  danger,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-[7px] text-muted-foreground transition-colors",
        danger
          ? "hover:bg-destructive/15 hover:text-destructive"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
