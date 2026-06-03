import { invoke } from "@tauri-apps/api/core";
import { LOCAL_WORKSPACE } from "@/modules/workspace/env";
import {
  readLastWorkspacePath,
  validateWorkspacePath,
} from "@/modules/workspace/lastPath";

let cached: string | undefined;

export async function initLaunchDir(): Promise<void> {
  const cli = await invoke<string | null>("get_launch_dir").catch(() => null);
  if (cli) {
    cached = cli.replace(/\\/g, "/");
    return;
  }
  const stored = await readLastWorkspacePath(LOCAL_WORKSPACE);
  if (!stored) return;
  const valid = await validateWorkspacePath(stored, LOCAL_WORKSPACE);
  cached = valid ?? undefined;
}

export function getLaunchDir(): string | undefined {
  return cached;
}
