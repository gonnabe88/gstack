#!/usr/bin/env bun
// Cross-platform chmod +x for compiled binaries.
// On Windows, .exe files are already executable — skip chmod entirely.

import { chmodSync, existsSync } from "node:fs";

if (process.platform === "win32") process.exit(0);

const bins = [
  "browse/dist/browse",
  "browse/dist/find-browse",
  "design/dist/design",
  "make-pdf/dist/pdf",
  "bin/gstack-global-discover",
];

for (const bin of bins) {
  if (existsSync(bin)) chmodSync(bin, 0o755);
}
