import { invoke } from "@tauri-apps/api/core";
import { LazyStore } from "@tauri-apps/plugin-store";
import {
  currentWorkspaceEnv,
  LOCAL_WORKSPACE,
  workspaceScopeKey,
  type WorkspaceEnv,
} from "./env";

const STORE_PATH = "gencode-settings.json";
const KEY_LAST_WORKSPACE_PATHS = "lastWorkspacePaths";

const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

export type LastWorkspacePaths = Record<string, string>;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

export async function readLastWorkspacePath(
  env: WorkspaceEnv = currentWorkspaceEnv(),
): Promise<string | null> {
  const map = (await store.get<LastWorkspacePaths>(KEY_LAST_WORKSPACE_PATHS)) ?? {};
  const path = map[workspaceScopeKey(env)];
  return path ? normalizePath(path) : null;
}

export async function writeLastWorkspacePath(
  path: string,
  env: WorkspaceEnv = currentWorkspaceEnv(),
): Promise<void> {
  const normalized = normalizePath(path);
  const map = (await store.get<LastWorkspacePaths>(KEY_LAST_WORKSPACE_PATHS)) ?? {};
  map[workspaceScopeKey(env)] = normalized;
  await store.set(KEY_LAST_WORKSPACE_PATHS, map);
  await store.save();
}

export async function clearLastWorkspacePath(
  env: WorkspaceEnv = currentWorkspaceEnv(),
): Promise<void> {
  const map = (await store.get<LastWorkspacePaths>(KEY_LAST_WORKSPACE_PATHS)) ?? {};
  delete map[workspaceScopeKey(env)];
  await store.set(KEY_LAST_WORKSPACE_PATHS, map);
  await store.save();
}

/** Returns the path when it still exists as a directory; otherwise null. */
export async function validateWorkspacePath(
  path: string,
  env: WorkspaceEnv = LOCAL_WORKSPACE,
): Promise<string | null> {
  const normalized = normalizePath(path);
  try {
    await invoke("workspace_authorize", { path: normalized, workspace: env });
    const stat = await invoke<{ kind: string }>("fs_stat", {
      path: normalized,
      workspace: env,
    });
    if (stat.kind !== "dir") {
      await clearLastWorkspacePath(env);
      return null;
    }
    return normalized;
  } catch {
    await clearLastWorkspacePath(env);
    return null;
  }
}
