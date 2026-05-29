import { create } from "zustand";

export interface RuntimeStatus {
  installed: boolean;
  version: string | null;
  latest_version: string | null;
  update_available: boolean;
  source: "system" | "bundled" | "not_found";
  binary_path: string | null;
}

export type SourcePreference = "auto" | "system" | "bundled";

export interface ClaudeCodeSession {
  id: number;
  prompt: string;
  status: "spawning" | "working" | "attention" | "finished" | "exited";
  startedAt: number;
}

interface ClaudeCodeStore {
  runtimeStatus: RuntimeStatus | null;
  sessions: ClaudeCodeSession[];
  launcherOpen: boolean;

  setRuntimeStatus: (status: RuntimeStatus | null) => void;
  addSession: (session: ClaudeCodeSession) => void;
  updateSession: (id: number, update: Partial<ClaudeCodeSession>) => void;
  removeSession: (id: number) => void;
  setLauncherOpen: (open: boolean) => void;
}

export const useClaudeCodeStore = create<ClaudeCodeStore>((set) => ({
  runtimeStatus: null,
  sessions: [],
  launcherOpen: false,

  setRuntimeStatus: (status) => set({ runtimeStatus: status }),

  addSession: (session) =>
    set((s) => ({ sessions: [...s.sessions, session] })),

  updateSession: (id, update) =>
    set((s) => ({
      sessions: s.sessions.map((ses) =>
        ses.id === id ? { ...ses, ...update } : ses,
      ),
    })),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((ses) => ses.id !== id),
    })),

  setLauncherOpen: (open) => set({ launcherOpen: open }),
}));
