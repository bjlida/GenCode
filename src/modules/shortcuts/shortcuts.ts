import { IS_MAC, MOD_PROP } from "@/lib/platform";

/**
 * Single source of truth for keyboard shortcuts.
 */

export type ShortcutId =
  | "tab.new"
  | "tab.newPrivate"
  | "tab.newPreview"
  | "tab.newEditor"
  | "tab.close"
  | "tab.next"
  | "tab.prev"
  | "tab.selectByIndex"
  | "pane.splitRight"
  | "pane.splitDown"
  | "pane.focusNext"
  | "pane.focusPrev"
  | "pane.source"
  | "search.focus"
  | "explorer.search"
  | "explorer.focus"
  | "view.zoomIn"
  | "view.zoomOut"
  | "view.zoomReset"
  | "ai.toggle"
  | "ai.askSelection"
  | "shortcuts.open"
  | "settings.open"
  | "sidebar.toggle"
  | "editor.undo"
  | "editor.redo"
  | "editor.replace"
  | "editor.format"
  | "claudeCode.commands";

export type ShortcutGroup =
  | "常规"
  | "标签页"
  | "窗格"
  | "搜索"
  | "AI"
  | "视图"
  | "编辑器"
  | "Claude Code";

export type KeyBinding = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type Shortcut = {
  id: ShortcutId;
  label: string;
  group: ShortcutGroup;
  defaultBindings: KeyBinding[];
  allowRepeat?: boolean;
};

export const SHORTCUTS: Shortcut[] = [
  {
    id: "settings.open",
    label: "打开设置",
    group: "常规",
    defaultBindings: [{ [MOD_PROP]: true, key: "," }],
  },
  {
    id: "shortcuts.open",
    label: "显示快捷键",
    group: "常规",
    defaultBindings: [{ [MOD_PROP]: true, key: "k" }],
  },
  {
    id: "tab.new",
    label: "新建标签页",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "t" }],
  },
  {
    id: "tab.newPrivate",
    label: "新建隐私终端",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "r" }],
  },
  {
    id: "tab.newPreview",
    label: "新建预览标签页",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "p" }],
  },
  {
    id: "tab.newEditor",
    label: "新建编辑器标签页",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "e" }],
  },
  {
    id: "tab.close",
    label: "关闭标签页或窗格",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "w" }],
  },
  {
    id: "pane.splitRight",
    label: "向右分屏",
    group: "窗格",
    defaultBindings: [{ [MOD_PROP]: true, key: "d" }],
  },
  {
    id: "pane.splitDown",
    label: "向下分屏",
    group: "窗格",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "d" }],
  },
  {
    id: "pane.focusNext",
    label: "聚焦下一个窗格",
    group: "窗格",
    defaultBindings: [{ [MOD_PROP]: true, key: "]" }],
  },
  {
    id: "pane.focusPrev",
    label: "聚焦上一个窗格",
    group: "窗格",
    defaultBindings: [{ [MOD_PROP]: true, key: "[" }],
  },  
  {
    id: "pane.source",
    label: "切换源码面板",
    group: "窗格",
    defaultBindings: [{ [MOD_PROP]: true, key: "g" }],
  },
  {
    id: "tab.next",
    label: "下一个标签页",
    group: "标签页",
    defaultBindings: [{ ctrl: true, key: "Tab" }],
  },
  {
    id: "tab.prev",
    label: "上一个标签页",
    group: "标签页",
    defaultBindings: [{ ctrl: true, shift: true, key: "Tab" }],
  },
  {
    id: "tab.selectByIndex",
    label: "跳转到标签页 1–9",
    group: "标签页",
    defaultBindings: [{ [MOD_PROP]: true, key: "1" }],
  },
  {
    id: "explorer.search",
    label: "搜索文件",
    group: "搜索",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "f" }],
  },
  {
    id: "search.focus",
    label: "在终端中查找",
    group: "搜索",
    defaultBindings: [{ [MOD_PROP]: true, key: "f" }],
  },
  {
    id: "ai.toggle",
    label: "切换 AI 助手",
    group: "AI",
    defaultBindings: [{ [MOD_PROP]: true, key: "i" }],
  },
  {
    id: "ai.askSelection",
    label: "向 AI 询问选中内容",
    group: "AI",
    defaultBindings: [{ [MOD_PROP]: true, key: "l" }],
  },
  {
    id: "claudeCode.commands",
    label: "Claude Code 命令参考",
    group: "Claude Code",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "?" }],
  },
  {
    id: "sidebar.toggle",
    label: "切换资源管理器",
    group: "视图",
    defaultBindings: [{ [MOD_PROP]: true, key: "b" }],
  },
  {
    id: "explorer.focus",
    label: "切换资源管理器焦点",
    group: "视图",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "e" }],
  },
  {
    id: "view.zoomIn",
    label: "放大",
    group: "视图",
    defaultBindings: [
      { [MOD_PROP]: true, key: "=" },
      { [MOD_PROP]: true, shift: true, key: "+" },
    ],
    allowRepeat: true,
  },
  {
    id: "view.zoomOut",
    label: "缩小",
    group: "视图",
    defaultBindings: [
      { [MOD_PROP]: true, key: "-" },
      { [MOD_PROP]: true, shift: true, key: "_" },
    ],
    allowRepeat: true,
  },
  {
    id: "view.zoomReset",
    label: "重置缩放",
    group: "视图",
    defaultBindings: [{ [MOD_PROP]: true, key: "0" }],
  },
  // Editor entries are display-only: CodeMirror's historyKeymap binds these
  // keys natively. We register them here so the shortcuts dialog can surface
  // them — they don't have App-level handlers, so `useGlobalShortcuts` falls
  // through without `preventDefault`, leaving CodeMirror to handle the event.
  // Also excluded from the customization UI in ShortcutsSection.
  {
    id: "editor.undo",
    label: "撤销",
    group: "编辑器",
    defaultBindings: [{ [MOD_PROP]: true, key: "z" }],
  },
  {
    id: "editor.redo",
    label: "重做",
    group: "编辑器",
    defaultBindings: [{ [MOD_PROP]: true, key: "y" }],
  },
  {
    id: "editor.replace",
    label: "查找并替换",
    group: "编辑器",
    defaultBindings: [{ [MOD_PROP]: true, key: "h" }],
  },
  {
    id: "editor.format",
    label: "格式化文档",
    group: "编辑器",
    defaultBindings: [{ [MOD_PROP]: true, shift: true, alt: true, key: "f" }],
  },
];

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  "常规",
  "标签页",
  "窗格",
  "视图",
  "搜索",
  "AI",
  "编辑器",
];

/**
 * Matching logic: checks if a KeyboardEvent matches a KeyBinding.
 */
export function matchBinding(
  e: KeyboardEvent,
  binding: KeyBinding,
  id?: ShortcutId
): boolean {
  const eventKey = e.key.toLowerCase();
  const bindingKey = binding.key.toLowerCase();

  // Special case for Jump to Tab 1-9
  if (id === "tab.selectByIndex") {
    if (!/^[1-9]$/.test(e.key)) return false;
  } else if (eventKey !== bindingKey) {
    return false;
  }

  return (
    !!e.ctrlKey === !!binding.ctrl &&
    !!e.shiftKey === !!binding.shift &&
    !!e.altKey === !!binding.alt &&
    !!e.metaKey === !!binding.meta
  );
}

/**
 * Display helpers
 */
export function getBindingTokens(binding?: KeyBinding): string[] {
  if (!binding) return [];
  const tokens: string[] = [];
  if (IS_MAC) {
    if (binding.ctrl) tokens.push("⌃");
    if (binding.alt) tokens.push("⌥");
    if (binding.shift) tokens.push("⇧");
    if (binding.meta) tokens.push("⌘");
  } else {
    if (binding.ctrl) tokens.push("Ctrl");
    if (binding.alt) tokens.push("Alt");
    if (binding.shift) tokens.push("Shift");
    if (binding.meta) tokens.push("Win");
  }

  let keyLabel = binding.key;
  if (keyLabel === " ") keyLabel = "Space";
  else if (keyLabel === "ArrowUp") keyLabel = "↑";
  else if (keyLabel === "ArrowDown") keyLabel = "↓";
  else if (keyLabel === "ArrowLeft") keyLabel = "←";
  else if (keyLabel === "ArrowRight") keyLabel = "→";
  else if (keyLabel.length === 1) keyLabel = keyLabel.toUpperCase();

  tokens.push(keyLabel);
  return tokens;
}
