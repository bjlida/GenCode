import { invoke, Channel } from "@tauri-apps/api/core";
import type { RuntimeStatus } from "../store/claudeCodeStore";

export async function fetchRuntimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>("claude_code_check_updates");
}

export async function installRuntime(): Promise<void> {
  return invoke("claude_code_install");
}

export async function updateRuntime(): Promise<void> {
  return invoke("claude_code_update");
}

export interface SpawnOptions {
  prompt: string;
  cwd?: string;
  model?: string;
  workspaceRoot: string;
  extraEnv?: Record<string, string>;
  cols: number;
  rows: number;
  /** Called when the PTY produces output bytes. */
  onData?: (bytes: ArrayBuffer) => void;
  /** Called when the PTY session exits. */
  onExit?: (code: number) => void;
}

export async function spawnClaudeCode(opts: SpawnOptions): Promise<number> {
  const onData = new Channel<ArrayBuffer>();
  const onExit = new Channel<number>();

  // Wire up channel listeners so data from the Rust backend reaches the UI.
  onData.onmessage = (buf) => {
    opts.onData?.(buf);
  };
  onExit.onmessage = (code) => {
    opts.onExit?.(code);
  };

  const sessionId = await invoke<number>("claude_code_spawn", {
    cols: opts.cols,
    rows: opts.rows,
    prompt: opts.prompt,
    cwd: opts.cwd ?? null,
    model: opts.model ?? null,
    workspaceRoot: opts.workspaceRoot,
    extraEnv: opts.extraEnv ?? null,
    onData,
    onExit,
  });

  return sessionId;
}

export async function sendToSession(
  sessionId: number,
  instruction: string,
): Promise<void> {
  return invoke("claude_code_send", { sessionId, instruction });
}

export async function killSession(sessionId: number): Promise<void> {
  return invoke("claude_code_kill", { sessionId });
}

export async function getConfig(key: string): Promise<unknown> {
  return invoke("claude_code_get_config", { key });
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  return invoke("claude_code_set_config", { key, value });
}
