import { useSettingsOverlayStore } from "./settingsOverlayStore";
import type { SettingsTab } from "./openSettingsWindow.types";

export type { SettingsTab } from "./openSettingsWindow.types";

export async function openSettingsWindow(tab?: SettingsTab): Promise<void> {
  useSettingsOverlayStore.getState().openSettings(tab);
}
