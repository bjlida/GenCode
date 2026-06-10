#!/usr/bin/env node
/**
 * Fail the build if release artifacts contain embedded API keys or secrets.
 * Keys belong in the OS keychain only — never in dist/ or installer bundles.
 */
import fs from "node:fs";
import path from "node:path";

const SCAN_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".css",
  ".txt",
  ".map",
  ".svg",
]);

const PATTERNS = [
  { kind: "openai-key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: "anthropic-key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: "github-token", re: /\bgh[opsur]_[A-Za-z0-9]{36,}\b/g },
  { kind: "github-pat", re: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g },
  { kind: "cerebras-key", re: /\bcsk-[A-Za-z0-9_-]{20,}\b/g },
];

const PLACEHOLDER_SUBSTRINGS = [
  "<REDACTED",
  "••••",
  "your-api-key",
  "YOUR_API_KEY",
  "example.com",
];

function isPlaceholder(match) {
  const m = match.toLowerCase();
  return PLACEHOLDER_SUBSTRINGS.some((p) => m.includes(p.toLowerCase()));
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  const st = fs.statSync(dir);
  if (!st.isDirectory()) {
    yield dir;
    return;
  }
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    yield* walk(path.join(dir, name));
  }
}

function scanFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SCAN_EXTENSIONS.has(ext)) return [];

  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }
  if (text.length > 8 * 1024 * 1024) return [];

  const hits = [];
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isPlaceholder(m[0])) continue;
      const line = text.slice(0, m.index).split("\n").length;
      hits.push({ kind, match: m[0].slice(0, 12) + "…", line });
    }
  }
  return hits.map((h) => ({ file: filePath, ...h }));
}

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error("Usage: node scripts/verify-no-secrets-in-artifacts.mjs <dir> [...]");
  process.exit(2);
}

const allHits = [];
for (const root of roots) {
  const abs = path.resolve(root);
  for (const file of walk(abs)) {
    allHits.push(...scanFile(file));
  }
}

if (allHits.length > 0) {
  console.error("verify-no-secrets: possible API keys in release artifacts:\n");
  for (const h of allHits) {
    console.error(`  ${h.file}:${h.line} [${h.kind}] ${h.match}`);
  }
  console.error(
    "\nDo not bundle credentials. Store keys via OS keychain (secrets_*), not in dist/ or repo.",
  );
  process.exit(1);
}

console.log(
  `verify-no-secrets: OK (${roots.join(", ") || "no dirs"} — no key patterns in text artifacts)`,
);
