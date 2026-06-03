import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ALT_KEY,
  fmtShortcut,
  MOD_KEY,
  SHIFT_KEY,
} from "@/lib/platform";
import { COMPACT_CONTENT, COMPACT_ITEM } from "@/modules/explorer/lib/menuItemClass";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onUndo: () => void;
  onRedo: () => void;
  onFormat: () => void;
  onFocus?: () => void;
  formatEnabled?: boolean;
};

export function EditorContextMenu({
  children,
  onUndo,
  onRedo,
  onFormat,
  onFocus,
  formatEnabled = true,
}: Props) {
  const withFocus = (action: () => void) => {
    onFocus?.();
    action();
  };
  const clipboard = (action: "cut" | "copy" | "paste") => {
    withFocus(() => document.execCommand(action));
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={COMPACT_CONTENT}>
        <ContextMenuItem className={COMPACT_ITEM} onSelect={() => withFocus(onUndo)}>
          撤销
          <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "Z")}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem className={COMPACT_ITEM} onSelect={() => withFocus(onRedo)}>
          重做
          <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "Y")}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className={COMPACT_ITEM} onSelect={() => clipboard("cut")}>
          剪切
          <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "X")}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem className={COMPACT_ITEM} onSelect={() => clipboard("copy")}>
          复制
          <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "C")}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem className={COMPACT_ITEM} onSelect={() => clipboard("paste")}>
          粘贴
          <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "V")}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className={COMPACT_ITEM}
          disabled={!formatEnabled}
          onSelect={() => withFocus(onFormat)}
        >
          格式化代码
          <ContextMenuShortcut>
            {fmtShortcut(MOD_KEY, SHIFT_KEY, ALT_KEY, "F")}
          </ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
