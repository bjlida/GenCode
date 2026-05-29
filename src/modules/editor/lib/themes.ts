import { atomone } from "@uiw/codemirror-theme-atomone";
import { aura } from "@uiw/codemirror-theme-aura";
import { copilot } from "@uiw/codemirror-theme-copilot";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { gruvboxDark } from "@uiw/codemirror-theme-gruvbox-dark";
import { nord } from "@uiw/codemirror-theme-nord";
import { tokyoNightInit } from "@uiw/codemirror-theme-tokyo-night";
import { xcodeDark, xcodeLight } from "@uiw/codemirror-theme-xcode";
import { tags } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Prec } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { EditorThemeId } from "@/modules/settings/store";

// Markdown heading markers (#, ##, …) and heading text are notoriously dim in
// many dark editor themes — override them so they are readable at a glance.
const HEADING_HIGHLIGHT = Prec.highest(
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: [
          tags.heading,
          tags.heading1,
          tags.heading2,
          tags.heading3,
          tags.heading4,
          tags.heading5,
          tags.heading6,
        ],
        color: "#e06c75",
        fontWeight: "bold",
      },
      {
        tag: tags.processingInstruction,
        color: "#6cb6ff",
      },
    ]),
  ),
);

function withHeading(theme: Extension): Extension[] {
  return [HEADING_HIGHLIGHT, theme];
}

// Tokyo Night's default foreground (#787c99) and comment (#444b6a) are too dim
// on a dark background — bump them for readability.
const tokyoNight = tokyoNightInit({
  settings: {
    foreground: "#a9b1d6",
    gutterForeground: "#565f89",
    lineHighlight: "#2f3346",
    selection: "#515c7e80",
  },
  styles: [{ tag: tags.comment, color: "#565f89" }],
});

export const EDITOR_THEME_EXT: Record<EditorThemeId, Extension> = {
  atomone: withHeading(atomone),
  aura: withHeading(aura),
  copilot: withHeading(copilot),
  "github-dark": withHeading(githubDark),
  "github-light": githubLight,
  "gruvbox-dark": withHeading(gruvboxDark),
  nord: withHeading(nord),
  "tokyo-night": withHeading(tokyoNight),
  "xcode-dark": withHeading(xcodeDark),
  "xcode-light": xcodeLight,
};
