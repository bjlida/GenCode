import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { currentWorkspaceEnv } from "@/modules/workspace";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootPath: string | null;
  onCreated: (path: string) => void;
};

function joinPath(parent: string, name: string): string {
  if (parent.endsWith("/")) return `${parent}${name}`;
  return `${parent}/${name}`;
}

export function NewEditorDialog({
  open,
  onOpenChange,
  rootPath,
  onCreated,
}: Props) {
  const [name, setName] = useState("未命名.txt");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("未命名.txt");
    setError(null);
    // Pre-select the basename so the user can quickly retype the filename
    // while keeping the extension handy.
    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const dot = el.value.lastIndexOf(".");
      el.setSelectionRange(0, dot > 0 ? dot : el.value.length);
    }, 0);
  }, [open]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("请输入文件名");
      return;
    }
    if (trimmed.includes("..")) {
      setError("路径必须为相对路径");
      return;
    }
    if (!rootPath) {
      setError("未打开工作区");
      return;
    }
    const path = trimmed.startsWith("/")
      ? trimmed
      : joinPath(rootPath, trimmed);
    try {
      await invoke("fs_create_file", { path, workspace: currentWorkspaceEnv() });
      onCreated(path);
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-[13px]">
            <HugeiconsIcon icon={File02Icon} size={15} strokeWidth={1.75} />
            新建文件
          </DialogTitle>
          <DialogDescription>
            文件名相对于工作区根目录，扩展名决定编辑器的语言模式。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-editor-filename">文件名</Label>
          <Input
            id="new-editor-filename"
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="示例.ts"
            className="h-8 text-[12px]"
          />
          {error ? (
            <p className="text-[11px] text-destructive">{error}</p>
          ) : (
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {rootPath ? joinPath(rootPath, name.trim() || "…") : "—"}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={() => void submit()}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
