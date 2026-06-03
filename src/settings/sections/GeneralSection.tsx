import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/modules/settings/preferences";
import type { ThemePref } from "@/modules/settings/store";
import {
  TERMINAL_FONT_SIZES,
  TERMINAL_SCROLLBACK_PRESETS,
  setAgentNotifications,
  setAutostart,
  setRestoreWindowState,
  setShowHidden,
  setTerminalFontFamily,
  setTerminalLetterSpacing,
  setTerminalFontSize,
  setTerminalScrollback,
  setTerminalWebglEnabled,
  setVimMode,
  setEditorWordWrap,
  setZoomLevel,
} from "@/modules/settings/store";
import { useTheme } from "@/modules/theme";
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";
import { SettingsCard } from "../components/SettingsCard";
import { VoiceInputSection } from "./VoiceInputSection";

const APPEARANCE: {
  id: ThemePref;
  label: string;
  icon: typeof ComputerIcon;
}[] = [
  { id: "system", label: "跟随系统", icon: ComputerIcon },
  { id: "light", label: "浅色", icon: Sun03Icon },
  { id: "dark", label: "深色", icon: Moon02Icon },
];

const LETTER_SPACINGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;

export function GeneralSection() {
  const { mode, setMode } = useTheme();

  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const vimMode = usePreferencesStore((s) => s.vimMode);
  const editorWordWrap = usePreferencesStore((s) => s.editorWordWrap);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const terminalWebglEnabled = usePreferencesStore(
    (s) => s.terminalWebglEnabled,
  );
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalLetterSpacing = usePreferencesStore(
    (s) => s.terminalLetterSpacing,
  );
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);
  const agentNotifications = usePreferencesStore((s) => s.agentNotifications);

  useEffect(() => {
    let alive = true;
    void isEnabled()
      .then((on) => {
        if (!alive) return;
        if (on !== usePreferencesStore.getState().autostart) {
          void setAutostart(on);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const onToggleAutostart = async (next: boolean) => {
    try {
      if (next) await enable();
      else await disable();
      await setAutostart(next);
    } catch (e) {
      console.error("autostart toggle failed", e);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="通用"
        description="外观模式、编辑器与启动项。"
      />

      <div className="flex flex-col gap-4">
        <SettingsCard title="外观">
          <div className="flex flex-wrap gap-2 py-3">
            {APPEARANCE.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setMode(o.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12.5px] transition-all",
                  mode === o.id
                    ? "border-foreground/50 bg-accent font-medium text-foreground"
                    : "border-border/40 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={o.icon} size={14} strokeWidth={1.5} />
                {o.label}
              </button>
            ))}
          </div>
          <p className="border-t border-border/35 pb-3 text-[11.5px] text-muted-foreground">
            主题、背景与更多自定义选项请前往{" "}
            <strong className="font-medium text-foreground">主题</strong> 页。
          </p>
        </SettingsCard>

        <SettingsCard title="缩放">
          <SettingRow
            title="UI 缩放级别"
            description="调整界面整体显示大小。"
          >
            <div className="flex w-44 flex-col items-end gap-2">
              <span className="tabular-nums text-[12px] text-muted-foreground">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Slider
                className="w-full"
                value={[zoomLevel]}
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                onValueChange={(v) => void setZoomLevel(v[0] ?? 1)}
              />
            </div>
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="编辑器">
          <SettingRow
            title="Vim 模式"
            description="在代码编辑器中启用 Vim 快捷键。"
          >
            <Switch
              checked={vimMode}
              onCheckedChange={(v) => void setVimMode(v)}
            />
          </SettingRow>
          <SettingRow
            title="自动换行"
            description="长行在编辑器内自动换行显示。"
          >
            <Switch
              checked={editorWordWrap}
              onCheckedChange={(v) => void setEditorWordWrap(v)}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="文件浏览器">
          <SettingRow
            title="显示隐藏文件"
            description="显示以点开头的文件和文件夹（如 .env、.gitignore）。"
          >
            <Switch
              checked={showHidden}
              onCheckedChange={(v) => void setShowHidden(v)}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="通知">
          <SettingRow
            title="运行通知"
            description="AI Agent 或 Claude Code 会话需要输入或完成时发送提醒。"
          >
            <Switch
              checked={agentNotifications}
              onCheckedChange={(v) => void setAgentNotifications(v)}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="启动">
          <SettingRow
            title="开机启动"
            description="登录系统时自动启动灵码ADE。"
          >
            <Switch
              checked={autostart}
              onCheckedChange={(v) => void onToggleAutostart(v)}
            />
          </SettingRow>
          <SettingRow
            title="恢复窗口位置和大小"
            description="下次启动时恢复主窗口的位置和大小。"
          >
            <Switch
              checked={restoreWindowState}
              onCheckedChange={(v) => void setRestoreWindowState(v)}
            />
          </SettingRow>
        </SettingsCard>

        <SettingsCard title="语音输入">
          <VoiceInputSection />
        </SettingsCard>

        <SettingsCard title="终端">
        <SettingRow
          title={
            <span className="inline-flex items-center gap-1.5">
              使用 WebGL 渲染器
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="cursor-help text-[11px] text-muted-foreground/70 leading-none"
                      aria-label="WebGL 渲染器更多信息"
                    >
                      i
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-65 text-[11px]">
                    xterm WebGL 渲染器将字形缓存在 GPU 纹理图集中。在某些 macOS
                    环境下，图集可能损坏导致文字无法辨认。关闭可回退到 DOM
                    渲染器。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          }
          description="硬件加速渲染。如出现文字花屏或空白块请关闭。"
        >
          <Switch
            checked={terminalWebglEnabled}
            onCheckedChange={(v) => void setTerminalWebglEnabled(v)}
          />
        </SettingRow>
        <SettingRow
          title="字体"
          description='Nerd Font 名称。留空则自动检测。'
        >
          <input
            type="text"
            value={terminalFontFamily}
            placeholder="自动检测"
            onChange={(e) => void setTerminalFontFamily(e.target.value)}
            className="h-8 w-48 rounded-xl border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground/40"
          />
        </SettingRow>
        <SettingRow
          title="字符间距"
          description="字符之间的额外水平间距（px）。"
        >
          <Select
            value={String(terminalLetterSpacing)}
            onValueChange={(v) => void setTerminalLetterSpacing(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LETTER_SPACINGS.map((v) => (
                <SelectItem key={v} value={String(v)} className="text-[12px]">
                  {v > 0 ? `+${v}` : v} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow title="字号" description="终端文字大小。">
          <Select
            value={String(terminalFontSize)}
            onValueChange={(v) => void setTerminalFontSize(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-[12px]">
                  {size} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          title="回滚行数"
          description="每个终端保留的历史行数。"
        >
          <Select
            value={String(terminalScrollback)}
            onValueChange={(v) => void setTerminalScrollback(Number(v))}
          >
            <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                <SelectItem
                  key={lines}
                  value={String(lines)}
                  className="text-[12px]"
                >
                  {lines.toLocaleString()} 行
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        </SettingsCard>
      </div>
    </div>
  );
}
