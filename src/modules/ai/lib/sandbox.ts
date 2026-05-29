import { invoke } from "@tauri-apps/api/core";

interface EnforcementResponse {
  allowed: boolean;
  needs_approval: boolean;
  reason: string | null;
}

export async function checkSandboxRead(path: string): Promise<EnforcementResponse> {
  return invoke<EnforcementResponse>("sandbox_check_read", { path });
}

export async function checkSandboxWrite(path: string): Promise<EnforcementResponse> {
  return invoke<EnforcementResponse>("sandbox_check_write", { path });
}

export async function checkSandboxCommand(command: string): Promise<EnforcementResponse> {
  return invoke<EnforcementResponse>("sandbox_check_command", { command });
}

export async function checkSandboxNetwork(domain: string): Promise<EnforcementResponse> {
  return invoke<EnforcementResponse>("sandbox_check_network", { domain });
}
