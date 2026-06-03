import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import { fmtShortcut, MOD_KEY } from "@/lib/platform";
import { isMarkdownPath } from "@/modules/markdown/lib/isMarkdownPath";
import { useEffect, useState } from "react";
import {
  copyToClipboard,
  relativePath,
  revealInFinder,
  terminalCwdForPath,
} from "./lib/contextActions";
import {
  canPasteAt,
  getExplorerClipboard,
  subscribeExplorerClipboard,
} from "./lib/explorerClipboard";
import { COMPACT_ITEM } from "./lib/menuItemClass";
import type { useFileTree } from "./lib/useFileTree";

type Tree = ReturnType<typeof useFileTree>;

export type ExplorerContextMenuItemsProps = {
  path: string;
  rootPath: string;
  isDir: boolean;
  tree: Tree;
  pasteTargetDir: string;
  createTargetDir: string;
  onOpenFile?: (path: string, pin?: boolean) => void;
  onOpenMarkdownPreview?: (path: string) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
  showOpen?: boolean;
  showAttachToAgent?: boolean;
  showRefresh?: boolean;
};

export function ExplorerContextMenuItems({
  path,
  rootPath,
  isDir,
  tree,
  pasteTargetDir,
  createTargetDir,
  onOpenFile,
  onOpenMarkdownPreview,
  onRevealInTerminal,
  onAttachToAgent,
  showOpen = true,
  showAttachToAgent = true,
  showRefresh = false,
}: ExplorerContextMenuItemsProps) {
  const [clipboard, setClipboard] = useState(getExplorerClipboard());
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => subscribeExplorerClipboard(() => setClipboard(getExplorerClipboard())), []);

  const canPaste =
    clipboard !== null && canPasteAt(pasteTargetDir, clipboard.path);
  const terminalPath = terminalCwdForPath(path, isDir);

  return (
    <>
      {showOpen && !isDir && onOpenFile && (
        <ContextMenuItem
          className={COMPACT_ITEM}
          onSelect={() => onOpenFile(path, true)}
        >
          打开
        </ContextMenuItem>
      )}
      {!isDir && isMarkdownPath(path) && onOpenMarkdownPreview && (
        <ContextMenuItem
          className={COMPACT_ITEM}
          onSelect={() => onOpenMarkdownPreview(path)}
        >
          打开预览
        </ContextMenuItem>
      )}
      {onRevealInTerminal && (
        <ContextMenuItem
          className={COMPACT_ITEM}
          onSelect={() => onRevealInTerminal(terminalPath)}
        >
          在终端中打开
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.cutPath(path)}
      >
        剪切
        <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "X")}</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.copyPath(path)}
      >
        复制
        <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "C")}</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        disabled={!canPaste}
        onSelect={() => void tree.pasteAt(pasteTargetDir)}
      >
        粘贴
        <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "V")}</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.beginRename(path)}
      >
        重命名
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        variant="destructive"
        onSelect={(e) => {
          e.preventDefault();
          if (isConfirmingDelete) {
            void tree.deletePath(path);
            setIsConfirmingDelete(false);
          } else {
            setIsConfirmingDelete(true);
          }
        }}
        onMouseLeave={() => setTimeout(() => setIsConfirmingDelete(false), 1500)}
      >
        {isConfirmingDelete ? "再次点击确认删除" : "删除"}
        <ContextMenuShortcut>Delete</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.beginCreate(createTargetDir, "file")}
      >
        新建文件
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.beginCreate(createTargetDir, "dir")}
      >
        新建文件夹
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => void revealInFinder(path)}
      >
        在资源管理器中显示
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => void copyToClipboard(path)}
      >
        复制路径
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => void copyToClipboard(relativePath(rootPath, path))}
      >
        复制相对路径
      </ContextMenuItem>
      {showRefresh && (
        <ContextMenuItem
          className={COMPACT_ITEM}
          onSelect={() => tree.refresh(rootPath)}
        >
          刷新
        </ContextMenuItem>
      )}
      {showAttachToAgent && onAttachToAgent && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            className={COMPACT_ITEM}
            onSelect={() => onAttachToAgent(path)}
          >
            附加到 AI 面板
          </ContextMenuItem>
        </>
      )}
    </>
  );
}

export type ExplorerEmptyContextMenuItemsProps = {
  rootPath: string;
  tree: Tree;
  onRevealInTerminal?: (path: string) => void;
};

export function ExplorerEmptyContextMenuItems({
  rootPath,
  tree,
  onRevealInTerminal,
}: ExplorerEmptyContextMenuItemsProps) {
  const [clipboard, setClipboard] = useState(getExplorerClipboard());

  useEffect(() => subscribeExplorerClipboard(() => setClipboard(getExplorerClipboard())), []);

  const canPaste =
    clipboard !== null && canPasteAt(rootPath, clipboard.path);

  return (
    <>
      {onRevealInTerminal && (
        <ContextMenuItem
          className={COMPACT_ITEM}
          onSelect={() => onRevealInTerminal(rootPath)}
        >
          在终端中打开
        </ContextMenuItem>
      )}
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => void revealInFinder(rootPath)}
      >
        在资源管理器中显示
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        disabled={!canPaste}
        onSelect={() => void tree.pasteAt(rootPath)}
      >
        粘贴
        <ContextMenuShortcut>{fmtShortcut(MOD_KEY, "V")}</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.beginCreate(rootPath, "file")}
      >
        新建文件
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.beginCreate(rootPath, "dir")}
      >
        新建文件夹
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => void copyToClipboard(rootPath)}
      >
        复制路径
      </ContextMenuItem>
      <ContextMenuItem
        className={COMPACT_ITEM}
        onSelect={() => tree.refresh(rootPath)}
      >
        刷新
      </ContextMenuItem>
    </>
  );
}
