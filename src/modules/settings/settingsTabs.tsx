import type { SettingsTab } from "./openSettingsWindow";
import { AboutSection } from "@/settings/sections/AboutSection";
import { AgentsSection } from "@/settings/sections/AgentsSection";
import { ClaudeCodeSection } from "@/settings/sections/ClaudeCodeSection";
import { GeneralSection } from "@/settings/sections/GeneralSection";
import { ModelsSection } from "@/settings/sections/ModelsSection";
import { ShortcutsSection } from "@/settings/sections/ShortcutsSection";
import { SkillsSection } from "@/settings/sections/SkillsSection";
import { ThemesSection } from "@/settings/sections/ThemesSection";
import {
  AiScanIcon,
  BookOpen01Icon,
  ClaudeIcon,
  InformationCircleIcon,
  KeyboardIcon,
  PaintBoardIcon,
  Settings01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import type { JSX } from "react";

export const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof Settings01Icon;
  component: () => JSX.Element;
}[] = [
  { id: "general", label: "通用", icon: Settings01Icon, component: GeneralSection },
  { id: "themes", label: "主题", icon: PaintBoardIcon, component: ThemesSection },
  { id: "shortcuts", label: "快捷键", icon: KeyboardIcon, component: ShortcutsSection },
  { id: "models", label: "模型", icon: AiScanIcon, component: ModelsSection },
  { id: "agents", label: "Agent", icon: UserMultiple02Icon, component: AgentsSection },
  { id: "claude-code", label: "Claude Code", icon: ClaudeIcon, component: ClaudeCodeSection },
  { id: "skills", label: "Claude 技能", icon: BookOpen01Icon, component: SkillsSection },
  { id: "about", label: "关于", icon: InformationCircleIcon, component: AboutSection },
];

export const VALID_SETTINGS_TABS: SettingsTab[] = SETTINGS_TABS.map((t) => t.id);

export function normalizeSettingsTab(tab: string | null | undefined): SettingsTab {
  if (tab === "ai" || tab === "connections") return "models";
  if (tab && (VALID_SETTINGS_TABS as string[]).includes(tab)) {
    return tab as SettingsTab;
  }
  return "general";
}
