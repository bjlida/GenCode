import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { memo } from "react";
import { ExplorerContextMenuItems } from "./ExplorerContextMenuItems";
import { InlineInput } from "./InlineInput";
import { fileIconUrl, folderIconUrl } from "./lib/iconResolver";
import { COMPACT_CONTENT } from "./lib/menuItemClass";
import type { useFileTree } from "./lib/useFileTree";

type Tree = ReturnType<typeof useFileTree>;

export type EntryRowProps = {
  path: string;
  name: string;
  isDir: boolean;
  isExpanded: boolean;
  depth: number;
  rootPath: string;
  tree: Tree;
  isSelected: boolean;
  isRenaming: boolean;
  onOpenFile: (path: string, pin?: boolean) => void;
  onSelectPath: (path: string) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
  onOpenMarkdownPreview?: (path: string) => void;
};

function EntryRowImpl(props: EntryRowProps) {
  const {
    path,
    name,
    isDir,
    isExpanded,
    depth,
    rootPath,
    tree,
    isSelected,
    isRenaming,
    onOpenFile,
    onSelectPath,
    onRevealInTerminal,
    onAttachToAgent,
    onOpenMarkdownPreview,
  } = props;

  const iconUrl = isDir ? folderIconUrl(name, isExpanded) : fileIconUrl(name);
  const createTarget = isDir ? path : path.slice(0, path.lastIndexOf("/")) || rootPath;
  const pasteTarget = createTarget;
  const paddingLeft = 6 + depth * 12;

  const handleClick = () => {
    if (tree.renaming) return;
    onSelectPath(path);
    if (isDir) tree.toggle(path);
    else onOpenFile(path, true);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {isRenaming ? (
          <div
            className="flex h-6 w-full min-w-0 items-center gap-2 px-1.5 text-[13px]"
            style={{ paddingLeft }}
          >
            <span className="size-3.5 shrink-0" />
            {iconUrl ? (
              <img src={iconUrl} alt="" className="size-4 shrink-0" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <InlineInput
              initial={name}
              onCommit={tree.commitRename}
              onCancel={tree.cancelRename}
            />
          </div>
        ) : (
          <button
            type="button"
            data-fs-path={path}
            onClick={handleClick}
            onDoubleClick={() => !isDir && tree.beginRename(path)}
            className={cn(
              "group flex h-6 w-full min-w-0 cursor-pointer items-center gap-2 rounded-[5px] px-1.5 text-left text-[13px] text-foreground/75 transition-colors hover:bg-accent/60",
              isSelected && "bg-accent text-foreground",
            )}
            style={{ paddingLeft }}
          >
            <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground">
              {isDir ? (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={12}
                  strokeWidth={2.25}
                  className={cn(
                    "transition-transform",
                    isExpanded && "rotate-90",
                  )}
                />
              ) : null}
            </span>
            {iconUrl ? (
              <img src={iconUrl} alt="" className="size-4 shrink-0" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate">{name}</span>
          </button>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent
        className={COMPACT_CONTENT}
        onCloseAutoFocus={(e) => {
          if (tree.renaming || tree.pendingCreate) e.preventDefault();
        }}
      >
        <ExplorerContextMenuItems
          path={path}
          rootPath={rootPath}
          isDir={isDir}
          tree={tree}
          pasteTargetDir={pasteTarget}
          createTargetDir={createTarget}
          onOpenFile={onOpenFile}
          onOpenMarkdownPreview={onOpenMarkdownPreview}
          onRevealInTerminal={onRevealInTerminal}
          onAttachToAgent={onAttachToAgent}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}

export const EntryRow = memo(EntryRowImpl);

export type PendingRowProps = {
  depth: number;
  kind: "file" | "dir";
  onCommit: (name: string) => void | Promise<void>;
  onCancel: () => void;
};

export function PendingRow({ depth, kind, onCommit, onCancel }: PendingRowProps) {
  return (
    <div
      className="flex h-6 w-full min-w-0 items-center gap-2 px-1.5 text-[13px]"
      style={{ paddingLeft: 6 + depth * 12 }}
    >
      <span className="size-3.5 shrink-0" />
      <img
        src={kind === "dir" ? folderIconUrl("", false) : fileIconUrl("untitled")}
        alt=""
        className="size-4 shrink-0 opacity-70"
      />
      <InlineInput
        initial=""
        placeholder={kind === "dir" ? "新建文件夹" : "新建文件"}
        onCommit={onCommit}
        onCancel={onCancel}
      />
    </div>
  );
}

export function StatusRow({
  depth,
  message,
  tone,
}: {
  depth: number;
  message: string;
  tone: "muted" | "error";
}) {
  return (
    <div
      className={cn(
        "h-6 truncate px-2 text-[13px] leading-6",
        tone === "error" ? "text-destructive" : "text-muted-foreground",
      )}
      style={{ paddingLeft: 6 + depth * 12 + 18 }}
    >
      {message}
    </div>
  );
}
