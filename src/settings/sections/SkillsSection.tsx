import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

interface SkillMeta {
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  source_url?: string | null;
}

interface InstalledSkill {
  dir_name: string;
  meta: SkillMeta;
  path: string;
  managed: boolean;
}

export function SkillsSection() {
  const [installed, setInstalled] = useState<InstalledSkill[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SkillMeta[]>([]);
  const [searching, setSearching] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshInstalled = async () => {
    try {
      const list = await invoke<InstalledSkill[]>("skills_list");
      setInstalled(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    void refreshInstalled();
  }, []);

  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    try {
      const results = await invoke<SkillMeta[]>("skills_search", {
        query: searchQuery,
      });
      setSearchResults(results);
    } catch (e) {
      setError(String(e));
    } finally {
      setSearching(false);
    }
  };

  const handleInstall = async (url: string) => {
    setInstalling(url);
    setError(null);
    try {
      await invoke("skills_install", { url });
      await refreshInstalled();
    } catch (e) {
      setError(String(e));
    } finally {
      setInstalling(null);
    }
  };

  const handleRemove = async (name: string) => {
    setError(null);
    try {
      await invoke("skills_remove", { dirName: name });
      await refreshInstalled();
    } catch (e) {
      setError(String(e));
    }
  };

  const installedNames = new Set(installed.map((s) => s.dir_name));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Skills"
        description="安装和管理技能以扩展 Claude Code 的能力"
      />

      {error && (
        <p className="font-mono text-[12px] text-destructive/80 break-all">
          {error}
        </p>
      )}

      {/* Search */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          Discover        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="搜索技能..."
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-[14px] outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {searching ? "搜索中..." : "搜索"}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="flex flex-col gap-2">
            {searchResults.map((s) => {
              const already = installedNames.has(s.name);
              return (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/60 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium">{s.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {s.description}
                    </p>
                    <div className="mt-1 flex gap-1">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-muted/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {already ? (
                    <span className="text-[12px] text-muted-foreground shrink-0">
                      已安装                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        s.source_url && handleInstall(s.source_url)
                      }
                      disabled={!s.source_url || installing === s.source_url}
                      className="rounded-md border border-border px-2 py-1 text-[12px] hover:bg-muted/50 disabled:opacity-50 shrink-0"
                    >
                      {installing === s.source_url ? "安装中..." : "安装"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Installed Skills */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
          已安装 ({installed.length})
        </h3>
        {installed.length === 0 ? (
          <p className="text-[14px] text-muted-foreground py-4 text-center">
            暂无已安装的技能          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {installed.map((s) => (
              <div
                key={s.dir_name}
                className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/60 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium">
                    {s.meta.name}
                    {!s.managed && (
                      <span className="ml-2 rounded bg-muted/50 px-1 py-0.5 text-[11px] text-muted-foreground">
                        手动                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {s.meta.description || s.path}
                  </p>
                </div>
                {s.managed && (
                  <button
                    type="button"
                    onClick={() => handleRemove(s.dir_name)}
                    className="text-[12px] text-destructive hover:underline shrink-0"
                  >
                    移除                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
