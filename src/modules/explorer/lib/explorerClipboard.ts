export type ExplorerClipboardMode = "copy" | "cut";

export type ExplorerClipboardEntry = {
  path: string;
  mode: ExplorerClipboardMode;
};

let clipboard: ExplorerClipboardEntry | null = null;
const listeners = new Set<() => void>();

export function getExplorerClipboard(): ExplorerClipboardEntry | null {
  return clipboard;
}

export function setExplorerClipboard(entry: ExplorerClipboardEntry | null): void {
  clipboard = entry;
  for (const fn of listeners) fn();
}

export function subscribeExplorerClipboard(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function canPasteAt(targetDir: string, sourcePath: string): boolean {
  if (targetDir === sourcePath || targetDir.startsWith(`${sourcePath}/`)) {
    return false;
  }
  const parent = sourcePath.slice(0, sourcePath.lastIndexOf("/"));
  const entry = getExplorerClipboard();
  if (entry?.mode === "cut" && parent === targetDir) return false;
  return true;
}
