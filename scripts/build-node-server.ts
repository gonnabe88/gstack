#!/usr/bin/env bun
// Build a Node.js-compatible server bundle for Windows.
// Replaces browse/scripts/build-node-server.sh for cross-platform builds.
// On Windows, Bun can't launch Playwright's Chromium (oven-sh/bun#4253, #9911).
// This script produces a server bundle that runs under Node.js with Bun API polyfills.

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const GSTACK_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(GSTACK_DIR, "browse", "src");
const DIST_DIR = join(GSTACK_DIR, "browse", "dist");
const SERVER_MJS = join(DIST_DIR, "server-node.mjs");

console.log("Building Node-compatible server bundle...");

// Step 1: Transpile server.ts to a single .mjs bundle
const result = await Bun.build({
  entrypoints: [join(SRC_DIR, "server.ts")],
  outdir: DIST_DIR,
  target: "node",
  naming: "server-node.mjs",
  external: ["playwright", "playwright-core", "diff", "bun:sqlite", "@ngrok/ngrok"],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Step 2: Post-process — regex substitutions
let content = readFileSync(SERVER_MJS, "utf-8");
// Replace import.meta.dir with a resolvable reference
content = content.replaceAll("import.meta.dir", "__browseNodeSrcDir");
// Stub out bun:sqlite (macOS-only cookie import, not needed on Windows)
content = content.replace(
  'import { Database } from "bun:sqlite";',
  'const Database = null; // bun:sqlite stubbed on Node'
);

// Step 3: Inject polyfill header after the first line
const firstNewline = content.indexOf("\n");
const firstLine = content.slice(0, firstNewline);
const rest = content.slice(firstNewline + 1);

const polyfillHeader = [
  "// ── Windows Node.js compatibility (auto-generated) ──",
  'import { fileURLToPath as _ftp } from "node:url";',
  'import { dirname as _dn } from "node:path";',
  'const __browseNodeSrcDir = _dn(_dn(_ftp(import.meta.url))) + "/src";',
  '{ const _r = createRequire(import.meta.url); _r("./bun-polyfill.cjs"); }',
  "// ── end compatibility ──",
].join("\n");

writeFileSync(SERVER_MJS, [firstLine, polyfillHeader, rest].join("\n"), "utf-8");

// Step 4: Copy polyfill to dist/
copyFileSync(join(SRC_DIR, "bun-polyfill.cjs"), join(DIST_DIR, "bun-polyfill.cjs"));

console.log(`Node server bundle ready: ${SERVER_MJS}`);
