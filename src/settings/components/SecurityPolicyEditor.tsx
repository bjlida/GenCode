import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionHeader } from "../components/SectionHeader";

interface SecurityPolicy {
  workspace_root: string;
  allowed_paths: string[];
  denied_paths: string[];
  allowed_commands: string[];
  denied_commands: string[];
  allowed_domains: string[];
  max_file_size_mb: number;
  max_process_count: number;
  require_approval_for: string[];
  preset_name?: string | null;
}

const PRESET_LABELS: Record<string, string> = {
  permissive: "Permissive",
  standard: "Standard",
  strict: "Strict",
};

const PRESET_NAME_ZH: Record<string, string> = {
  permissive: "宽松",
  standard: "标准",
  strict: "严格",
};

export function SecurityPolicyEditor() {
  const [policy, setPolicy] = useState<SecurityPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadPolicy();
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const loadPolicy = async () => {
    try {
      const p = await invoke<SecurityPolicy>("sandbox_get_policy");
      setPolicy(p);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const applyPreset = async (preset: string) => {
    try {
      const presets = await invoke<Record<string, SecurityPolicy>>("sandbox_policy_presets");
      const p = presets[preset];
      if (p) {
        setPolicy(p);
        await invoke("sandbox_update_policy", { policy: p });
        await loadPolicy();
        setSaved(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
        toast.success("已应用预设并保存");
      }
    } catch (e) {
      setError(String(e));
      toast.error("预设应用失败", { description: String(e) });
    }
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    setSaved(false);
    try {
      await invoke("sandbox_update_policy", { policy });
      await loadPolicy();
      setError(null);
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
      toast.success("安全策略已保存");
    } catch (e) {
      setError(String(e));
      toast.error("保存失败", { description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await invoke("sandbox_reset_policy");
      await loadPolicy();
      setSaved(false);
      toast.message("已恢复默认安全策略");
    } catch (e) {
      setError(String(e));
      toast.error("恢复默认失败", { description: String(e) });
    }
  };

  const toggleApproval = (category: string) => {
    if (!policy) return;
    const current = policy.require_approval_for;
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    setPolicy({ ...policy, require_approval_for: next, preset_name: null });
  };

  if (!policy) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Security Policy" description="" />
        <p className="text-[13px] text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const approvalCategories: [string, string][] = [
    ["file_write", "写入文件"],
    ["file_delete", "删除文件"],
    ["command_exec", "执行命令"],
    ["network", "网络"],
    ["process_mgmt", "进程管理"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="安全策略"
        description="控制 AI Agent 可以访问的系统资源"
      />

      {error && (
        <p className="font-mono text-[12px] text-destructive/80 break-all">{error}</p>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          预设
        </h3>
        <div className="flex flex-col gap-2">
          {Object.entries(PRESET_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`text-left rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                policy.preset_name && presetMatches(key, policy.preset_name)
                  ? "border-primary bg-primary/5"
                  : "border-border/30 bg-card/60 hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          工作区根目录
        </h3>
        <input
          type="text"
          value={policy.workspace_root}
          onChange={(e) =>
            setPolicy({ ...policy, workspace_root: e.target.value, preset_name: null })
          }
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
          placeholder="/home/user/project"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          需要审批的操作
        </h3>
        <div className="flex flex-col gap-1.5">
          {approvalCategories.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={policy.require_approval_for.includes(key)}
                onChange={() => toggleApproval(key)}
                className="size-4"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          限制
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[13px] text-muted-foreground">
              最大文件大小 (MB, 0 = 不限制)
            </label>
            <input
              type="number"
              value={policy.max_file_size_mb}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  max_file_size_mb: parseInt(e.target.value, 10) || 0,
                  preset_name: null,
                })
              }
              className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
              min={0}
            />
          </div>
          <div>
            <label className="text-[13px] text-muted-foreground">
              最大进程数 (0 = 不限制)
            </label>
            <input
              type="number"
              value={policy.max_process_count}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  max_process_count: parseInt(e.target.value, 10) || 0,
                  preset_name: null,
                })
              }
              className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
              min={0}
            />
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "保存中..." : saved ? "已保存" : "保存策略"}
        </button>
        <button
          type="button"
          onClick={() => void handleReset()}
          className="rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50"
        >
          恢复默认
        </button>
      </div>
    </div>
  );
}

function presetMatches(presetKey: string, name: string): boolean {
  const zh = PRESET_NAME_ZH[presetKey];
  const en = PRESET_LABELS[presetKey];
  return name === zh || name === en;
}
