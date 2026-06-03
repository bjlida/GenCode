import { create } from "zustand";
import type { SettingsTab } from "./openSettingsWindow";

type State = {
  open: boolean;
  tab: SettingsTab;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setTab: (tab: SettingsTab) => void;
};

export const useSettingsOverlayStore = create<State>((set) => ({
  open: false,
  tab: "general",
  openSettings: (tab) =>
    set({ open: true, tab: tab ?? "general" }),
  closeSettings: () => set({ open: false }),
  setTab: (tab) => set({ tab }),
}));
