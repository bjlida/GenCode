import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  enabled: boolean;
}

export function McpServerEditor() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await invoke<McpServerConfig[]>("mcp_list_servers");
      setServers(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const emptyServer = (): McpServerConfig => ({
    name: "",
    command: "",
    args: [],
    env: {},
    enabled: true,
  });

  const handleSave = async () => {
    if (!editing) return;
    try {
      await invoke("mcp_add_server", { server: editing });
      setShowForm(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleRemove = async (name: string) => {
    try {
      await invoke("mcp_remove_server", { name });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await invoke("mcp_toggle_server", { name, enabled });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="MCP"
        description="配置 Model Context Protocol 服务器以扩展 Claude Code"
      />

      {error && (
        <p className="font-mono text-[12px] text-destructive/80 break-all">{error}</p>
      )}

      {/* Server List */}
      <div className="flex flex-col gap-2">
        {servers.length === 0 && !showForm && (
          <p className="text-[13px] text-muted-foreground py-4 text-center">
            暂无 MCP 服务器
          </p>
        )}
        {servers.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/60 p-3"
          >
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => handleToggle(s.name, e.target.checked)}
              className="size-4"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{s.name}</p>
              <p className="text-[12px] text-muted-foreground font-mono truncate">
                {s.command} {s.args.join(" ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(s.name)}
              className="text-[12px] text-destructive hover:underline shrink-0"
            >
              移除
            </button>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && editing ? (
        <div className="rounded-xl border border-border/30 bg-card/60 p-4 flex flex-col gap-3">
          <div>
            <label className="text-[13px] font-medium">名称</label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
              placeholder="my-mcp-server"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium">命令</label>
            <input
              type="text"
              value={editing.command}
              onChange={(e) => setEditing({ ...editing, command: e.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
              placeholder="npx"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium">参数</label>
            <input
              type="text"
              value={editing.args.join(" ")}
              onChange={(e) =>
                setEditing({ ...editing, args: e.target.value.split(/\s+/).filter(Boolean) })
              }
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-mono"
              placeholder="-y @anthropic-ai/mcp-server-filesystem /path"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!editing.name || !editing.command}
              className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(emptyServer());
            setShowForm(true);
          }}
          className="self-start rounded-md border border-dashed border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted/50"
        >
          + 添加 MCP 服务器        </button>
      )}
    </div>
  );
}
