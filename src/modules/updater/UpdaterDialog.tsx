import { GenCodeLogoMark } from "@/components/GenCodeLogoMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { useUpdaterContext } from "./UpdaterProvider";

type DistroKey = "arch" | "debian" | "fedora";

function distroCommand(key: DistroKey, version: string): string {
  switch (key) {
    case "arch":
      return "yay -S gencode-bin";
    case "debian":
      return `sudo apt install ./GenCode_${version}_amd64.deb`;
    case "fedora":
      return `sudo dnf install ./GenCode-${version}-1.x86_64.rpm`;
  }
}

const DISTROS: { key: DistroKey; label: string }[] = [
  { key: "arch", label: "Arch" },
  { key: "debian", label: "Debian / Ubuntu" },
  { key: "fedora", label: "Fedora / RHEL" },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdaterDialog() {
  const { status, install, dismiss } = useUpdaterContext();
  const [copied, setCopied] = useState(false);
  const [distro, setDistro] = useState<DistroKey>("arch");
  const manualVersion =
    status.kind === "manual-available" ? status.info.version : "";
  const activeCommand = distroCommand(distro, manualVersion);

  const open =
    status.kind === "available" ||
    status.kind === "manual-available" ||
    status.kind === "downloading" ||
    status.kind === "ready";

  if (!open) return null;

  const update = status.kind === "available" ? status.update : null;
  const manual = status.kind === "manual-available" ? status.info : null;
  const downloading = status.kind === "downloading";
  const ready = status.kind === "ready";

  const copyCommand = async () => {
    if (!navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(activeCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const progressPct =
    downloading && status.contentLength
      ? Math.min(100, (status.downloaded / status.contentLength) * 100)
      : null;

  const canDismiss =
    status.kind === "available" || status.kind === "manual-available";

  const title = ready
    ? "更新就绪"
    : downloading
      ? "正在下载更新"
      : manual
        ? `发现新版本 v${manual.version}`
        : `发现新版本 v${update?.version ?? ""}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && canDismiss) dismiss();
      }}
    >
      <DialogContent
        showCloseButton={canDismiss}
        className={cn(
          "gap-0 overflow-hidden border-border/60 bg-card p-0 text-card-foreground sm:max-w-[440px]",
          "shadow-2xl ring-1 ring-border/40",
        )}
      >
        <div className="flex items-start gap-3 border-b border-border/40 bg-muted/20 px-5 py-4">
          <GenCodeLogoMark size={28} className="mt-0.5 shrink-0" />
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-[15px] font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed">
              {ready
                ? "安装包已就绪，重启后即可使用新版本。"
                : downloading
                  ? "请保持窗口打开，下载完成后将自动重启应用。"
                  : manual
                    ? `当前 v${manual.currentVersion}。选择发行版复制安装命令，或从 GitHub 下载。`
                    : update?.body?.trim() || "建议安装最新版本以获得修复与改进。"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          {downloading && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-medium text-foreground">
                  下载进度
                </span>
                <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                  {progressPct !== null
                    ? `${progressPct.toFixed(0)}%`
                    : "准备中…"}
                  {status.contentLength
                    ? ` · ${formatBytes(status.downloaded)} / ${formatBytes(status.contentLength)}`
                    : status.downloaded > 0
                      ? ` · ${formatBytes(status.downloaded)}`
                      : ""}
                </span>
              </div>
              <Progress
                value={progressPct ?? undefined}
                className={cn(
                  "h-2 bg-muted/60",
                  progressPct === null && "animate-pulse",
                )}
              />
            </div>
          )}

          {manual && !downloading && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
                {DISTROS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDistro(d.key)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 text-[12px] transition-colors",
                      distro === d.key
                        ? "bg-background font-medium text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 font-mono text-[12px]">
                <span className="flex-1 select-all break-all">
                  $ {activeCommand}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-[12px]"
                  onClick={() => void copyCommand()}
                >
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {(status.kind === "available" || manual) && (
          <DialogFooter className="border-t border-border/40 bg-muted/10 px-5 py-3">
            {status.kind === "available" && (
              <>
                <Button variant="ghost" size="sm" onClick={dismiss}>
                  稍后
                </Button>
                <Button size="sm" onClick={() => void install()}>
                  安装并重启
                </Button>
              </>
            )}
            {manual && (
              <>
                <Button variant="ghost" size="sm" onClick={dismiss}>
                  稍后
                </Button>
                <Button
                  size="sm"
                  onClick={() => void openUrl(manual.releaseUrl)}
                >
                  下载安装包
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
