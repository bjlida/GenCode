/** Shell command that formats `path` in place, or null if unsupported. */
export function buildFormatCommand(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "rs") {
    return `cargo fmt -- "${path}"`;
  }
  const normalized = path.replace(/\\/g, "/");
  return `npx prettier --write "${normalized}"`;
}
