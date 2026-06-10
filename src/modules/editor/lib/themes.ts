import { atomone } from "@uiw/codemirror-theme-atomone";
import { aura } from "@uiw/codemirror-theme-aura";
import { copilot } from "@uiw/codemirror-theme-copilot";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { gruvboxDark } from "@uiw/codemirror-theme-gruvbox-dark";
import { nord } from "@uiw/codemirror-theme-nord";
import { xcodeDark, xcodeLight } from "@uiw/codemirror-theme-xcode";
import { createTheme } from "@uiw/codemirror-themes";
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

function withHeading(theme: Extension | readonly Extension[]): Extension[] {
  const base = Array.isArray(theme) ? theme : [theme];
  return [HEADING_HIGHLIGHT, ...base];
}

// Standalone Tokyo Night palette for GenCode's transparent editor surface.
// tagName is a subtag of typeName — list tagName after typeName so HTML tags
// pick up the brighter red while TS types stay cyan.
const tokyoNight = createTheme({
  theme: "dark",
  settings: {
    background: "transparent",
    foreground: "#c0caf5",
    caret: "#c0caf5",
    selection: "#515c7e80",
    selectionMatch: "#515c7e40",
    gutterBackground: "transparent",
    gutterForeground: "#565f89",
    lineHighlight: "#292e42",
  },
  styles: [
    { tag: tags.keyword, color: "#bb9af7" },
    {
      tag: [tags.name, tags.deleted, tags.character, tags.macroName],
      color: "#c0caf5",
    },
    { tag: tags.typeName, color: "#0db9d7" },
    { tag: tags.tagName, color: "#f7768e" },
    { tag: tags.propertyName, color: "#7aa2f7" },
    { tag: tags.attributeName, color: "#bb9af7" },
    {
      tag: [
        tags.string,
        tags.inserted,
        tags.special(tags.propertyName),
        tags.attributeValue,
      ],
      color: "#9ece6a",
    },
    {
      tag: [tags.function(tags.variableName), tags.labelName],
      color: "#7aa2f7",
    },
    {
      tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
      color: "#bb9af7",
    },
    {
      tag: [tags.definition(tags.name), tags.separator],
      color: "#c0caf5",
    },
    { tag: tags.className, color: "#c0caf5" },
    {
      tag: [
        tags.number,
        tags.changed,
        tags.annotation,
        tags.modifier,
        tags.self,
        tags.namespace,
      ],
      color: "#ff9e64",
    },
    { tag: [tags.operator, tags.operatorKeyword], color: "#bb9af7" },
    { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: "#b4f9f8" },
    { tag: [tags.meta, tags.comment], color: "#565f89" },
    { tag: tags.heading, fontWeight: "bold", color: "#89ddff" },
    {
      tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
      color: "#c0caf5",
    },
    { tag: tags.invalid, color: "#ff5370" },
    { tag: tags.angleBracket, color: "#565f89" },
    { tag: tags.punctuation, color: "#a9b1d6" },
    {
      tag: [
        tags.variableName,
        tags.definition(tags.variableName),
        tags.local(tags.variableName),
      ],
      color: "#c0caf5",
    },
  ],
});

// Terminal-inspired dark palette (GenCode default): red keywords, yellow
// strings, green functions/properties, blue consts/numbers, gray comments on
// the app's transparent editor surface.
const gencodeDark = createTheme({
  theme: "dark",
  settings: {
    background: "transparent",
    foreground: "#e6e6e6",
    caret: "#e6e6e6",
    selection: "#4a556880",
    selectionMatch: "#4a556840",
    gutterBackground: "transparent",
    gutterForeground: "#5c6573",
    lineHighlight: "#ffffff0a",
  },
  styles: [
    {
      tag: [
        tags.keyword,
        tags.moduleKeyword,
        tags.controlKeyword,
        tags.operatorKeyword,
        tags.modifier,
        tags.self,
      ],
      color: "#ff7575",
    },
    { tag: tags.definitionKeyword, color: "#56b0ff" },
    {
      tag: [tags.string, tags.special(tags.string), tags.attributeValue],
      color: "#f0c674",
    },
    {
      tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.macroName],
      color: "#7ee787",
    },
    { tag: [tags.propertyName, tags.attributeName, tags.labelName], color: "#7ee787" },
    { tag: [tags.number, tags.changed], color: "#6cb6ff" },
    { tag: [tags.bool, tags.atom, tags.null, tags.special(tags.variableName)], color: "#c678dd" },
    { tag: [tags.typeName, tags.className, tags.namespace], color: "#56c8d8" },
    { tag: tags.tagName, color: "#56c8d8" },
    { tag: [tags.meta, tags.comment], color: "#7f8693" },
    { tag: [tags.url, tags.escape, tags.regexp, tags.link], color: "#56c8d8" },
    { tag: tags.heading, fontWeight: "bold", color: "#ff7575" },
    { tag: [tags.operator, tags.separator, tags.punctuation], color: "#c8cdd4" },
    { tag: tags.angleBracket, color: "#c8cdd4" },
    { tag: tags.invalid, color: "#ff5370" },
    { tag: tags.inserted, color: "#7ee787" },
    { tag: tags.deleted, color: "#ff7575" },
    {
      tag: [
        tags.name,
        tags.character,
        tags.variableName,
        tags.definition(tags.variableName),
        tags.local(tags.variableName),
        tags.constant(tags.name),
        tags.standard(tags.name),
        tags.definition(tags.name),
      ],
      color: "#e6e6e6",
    },
  ],
});

export const EDITOR_THEME_EXT: Record<EditorThemeId, Extension> = {
  atomone: withHeading(atomone),
  aura: withHeading(aura),
  copilot: withHeading(copilot),
  "gencode-dark": withHeading(gencodeDark),
  "github-dark": withHeading(githubDark),
  "github-light": githubLight,
  "gruvbox-dark": withHeading(gruvboxDark),
  nord: withHeading(nord),
  "tokyo-night": withHeading(tokyoNight),
  "xcode-dark": withHeading(xcodeDark),
  "xcode-light": xcodeLight,
};
