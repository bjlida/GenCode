import type { Extension } from "@codemirror/state";
import { useMemo } from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { EDITOR_THEMES, type EditorThemeId } from "@/modules/settings/store";
import { useTheme } from "@/modules/theme/ThemeProvider";
import { getBuiltinTheme, getDefaultTheme } from "@/modules/theme/themes";
import type { Theme } from "@/modules/theme/types";
import { EDITOR_THEME_EXT } from "./themes";

const LIGHT_EDITOR_THEMES: ReadonlySet<EditorThemeId> = new Set([
  "github-light",
  "xcode-light",
]);

function resolveUiTheme(id: string, custom: Theme[]): Theme {
  return custom.find((t) => t.id === id) ?? getBuiltinTheme(id) ?? getDefaultTheme();
}

export function resolveEditorThemeId(
  uiThemeId: string,
  resolvedMode: "dark" | "light",
  customThemes: Theme[],
  fallback: EditorThemeId,
): EditorThemeId {
  const paired = resolveUiTheme(uiThemeId, customThemes).editorTheme?.[resolvedMode];
  if (paired && (EDITOR_THEMES as readonly string[]).includes(paired)) {
    return paired as EditorThemeId;
  }
  // The editor surface is transparent over the UI background, so a fallback
  // whose light/dark polarity mismatches the mode is unreadable (dark text on
  // a dark surface or vice versa).
  if (LIGHT_EDITOR_THEMES.has(fallback) === (resolvedMode === "light")) {
    return fallback;
  }
  return resolvedMode === "dark" ? "gencode-dark" : "xcode-light";
}

export function useEditorThemeExtension(): {
  editorThemeId: EditorThemeId;
  themeExt: Extension;
} {
  const { themeId, resolvedMode, customThemes } = useTheme();
  const fallback = usePreferencesStore((s) => s.editorTheme);
  const editorThemeId = useMemo(
    () => resolveEditorThemeId(themeId, resolvedMode, customThemes, fallback),
    [themeId, resolvedMode, customThemes, fallback],
  );
  const themeExt = useMemo(
    () => EDITOR_THEME_EXT[editorThemeId] ?? EDITOR_THEME_EXT.atomone,
    [editorThemeId],
  );
  return { editorThemeId, themeExt };
}
