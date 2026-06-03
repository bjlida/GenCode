/** Cursor-aligned UI sans stack (mirrors globals.css --font-sans). */
export const CURSOR_SANS_STACK =
  "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif";

/** Cursor-aligned monospace stack — bundled JetBrains Mono first. */
export const CURSOR_MONO_STACK =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const CURSOR_MONO_LIGATURES = '"calt" 1, "liga" 1';

export const CURSOR_EDITOR_FONT_SIZE_PX = 14;
export const CURSOR_EDITOR_LINE_HEIGHT = 1.5;
export const CURSOR_TERMINAL_FONT_SIZE_PX = 14;

let monoReady: Promise<void> | null = null;

export function ensureMonoFontsLoaded(): Promise<void> {
  if (monoReady) return monoReady;
  if (typeof document === "undefined" || !document.fonts?.load) {
    monoReady = Promise.resolve();
    return monoReady;
  }
  monoReady = Promise.allSettled([
    document.fonts.load(`400 ${CURSOR_EDITOR_FONT_SIZE_PX}px "JetBrains Mono"`),
    document.fonts.load(`700 ${CURSOR_EDITOR_FONT_SIZE_PX}px "JetBrains Mono"`),
  ]).then(() => undefined);
  return monoReady;
}

export function detectMonoFontFamily(): string {
  return CURSOR_MONO_STACK;
}

export function resolveMonoFontFamily(preferred?: string): string {
  const trimmed = preferred?.trim();
  return trimmed || CURSOR_MONO_STACK;
}
