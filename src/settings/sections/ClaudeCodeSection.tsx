import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { McpServerEditor } from "../components/McpServerEditor";
import { SecurityPolicyEditor } from "../components/SecurityPolicyEditor";
import { SectionHeader } from "../components/SectionHeader";

interface RuntimeStatus {
  installed: boolean;
  version: string | null;
  latest_version: string | null;
  update_available: boolean;
  source: "system" | "bundled" | "not_found";
  binary_path: string | null;
}

type SourcePreference = "auto" | "system" | "bundled";

type SubTab = "basic" | "mcp" | "security";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "basic", label: "基本" },
  { id: "mcp", label: "MCP" },
  { id: "security", label: "安全" },
];

const SOURCE_LABELS: Record<SourcePreference, string> = {
  auto: "自动（优先系统安装版，回退到内置版）",
  system: "仅系统安装版",
  bundled: "仅灵码ADE 内置版",
};

const SOURCE_DESCRIPTIONS: Record<SourcePreference, string> = {
  auto: "如果系统 PATH 中有可用且足够新的 Claude Code，优先使用；否则使用灵码ADE 内置版本。",
  system: "仅使用系统已安装的 Claude Code。找不到时报错。",
  bundled: "仅使用灵码ADE 管理的 Claude Code 二进制文件。忽略系统安装。",
};

export function ClaudeCodeSection() {
  const [active, setActive] = useState<SubTab>("basic");
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [preference, setPreference] = useState<SourcePreference>("auto");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [s, p] = await Promise.all([
        invoke<RuntimeStatus>("claude_code_check_updates"),
        invoke<SourcePreference>("claude_code_get_source_preference"),
      ]);
      setStatus(s);
      setPreference(p);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await invoke("claude_code_install");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const handleUpdate = async () => {
    setInstalling(true);
    setError(null);
    try {
      await invoke("claude_code_update");
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(false);
    }
  };

  const handlePreferenceChange = async (p: SourcePreference) => {
    setPreference(p);
    setError(null);
    try {
      await invoke("claude_code_set_source_preference", { preference: p });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Claude Code"
        description="管理 Claude Code CLI 原生二进制、MCP 服务器和安全设置"
      />

      {/* Sub-tab navigation */}
      <div className="flex gap-1 rounded-lg bg-muted/40 p-1 w-fit">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`rounded-md px-3 py-1 text-[13px] font-medium transition-colors ${
              active === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Basic Settings */}
      {active === "basic" && (
        <>
          {/* Source Preference */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              来源</h3>
            <div className="rounded-xl border border-border/30 bg-card/60 p-4">
              <div className="flex flex-col gap-3">
                {(Object.keys(SOURCE_LABELS) as SourcePreference[]).map((key) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      preference === key
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/30 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="source-preference"
                      checked={preference === key}
                      onChange={() => handlePreferenceChange(key)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-medium">{SOURCE_LABELS[key]}</span>
                      <span className="text-[13px] text-muted-foreground leading-relaxed">
                        {SOURCE_DESCRIPTIONS[key]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Runtime Status */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              运行状态</h3>
            <div className="rounded-xl border border-border/30 bg-card/60 p-4">
              <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-[14px]">
                <dt className="text-muted-foreground">Claude Code</dt>
                <dd className="font-mono text-[13px] flex items-center gap-2">
                  {status?.installed
                    ? (status.version ?? "Unknown")
                    : "未安装"}
                  {status?.update_available && status?.latest_version && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      更新到 {status.latest_version}
                    </span>
                  )}
                </dd>

                <dt className="text-muted-foreground">来源</dt>
                <dd className="font-mono text-[13px]">
                  {status?.source === "system"
                    ? "系统"
                    : status?.source === "bundled"
                      ? "内置"
                      : "—"}
                </dd>

                <dt className="text-muted-foreground">路径</dt>
                <dd className="font-mono text-[13px] text-muted-foreground break-all max-w-[400px]">
                  {status?.binary_path ?? "—"}
                </dd>
              </dl>

              <div className="mt-3 flex gap-2 flex-wrap">
                {!status?.installed ? (
                  <button
                    type="button"
                    onClick={handleInstall}
                    disabled={installing}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {installing ? "安装中..." : "安装 Claude Code"}
                  </button>
                ) : (
                  <>
                    {status.update_available && (
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={installing}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {installing
                          ? "安装中..."
                          : `更新到 ${status.latest_version}`}
                      </button>
                    )}
                    {!status.update_available && (
                      <span className="text-[13px] text-muted-foreground py-1.5">
                        已是最新
                      </span>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50"
                >
                  刷新
                </button>
              </div>

              {error && (
                <p className="mt-2 font-mono text-[12px] text-destructive/80 break-all">
                  {error}
                </p>
              )}
            </div>
          </section>

          {/* API Key Status */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              API 密钥
            </h3>
            <div className="rounded-xl border border-border/30 bg-card/60 p-4">
              <p className="text-[14px] text-muted-foreground">
                Claude Code 使用灵码ADE AI 设置中配置的 Anthropic API
                密钥。如果已经设置了密钥，无需额外配置。
              </p>
            </div>
          </section>

          {/* Usage Info */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
              使用说明
            </h3>
            <div className="rounded-xl border border-border/30 bg-card/60 p-4">
              <ul className="list-disc pl-5 text-[14px] text-muted-foreground space-y-1">
                <li>
                  打开 AI 面板，使用{" "}
                  <code className="text-[13px] font-mono bg-muted px-1 rounded">
                    /claude-code
                  </code>{" "}
                  启动 Claude Code 代理
                </li>
                <li>
                  Claude Code 拥有对工作区、文件、终端和配置（包括代理 /
                  MCP / Skills）的完整访问权限
                </li>
                <li>
                  上述配置的 MCP 服务器可用于 Claude Code 会话
                </li>
                <li>
                  安全标签页中配置的策略会在 Claude Code 会话中强制执行
                </li>
              </ul>
            </div>
          </section>
        </>
      )}

      {/* MCP Settings */}
      {active === "mcp" && <McpServerEditor />}

      {/* Security Settings */}
      {active === "security" && <SecurityPolicyEditor />}
    </div>
  );
}
