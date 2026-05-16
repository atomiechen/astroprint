#!/usr/bin/env node
import { chmodSync, existsSync } from "node:fs";

const binPath = new URL("../dist/cli.js", import.meta.url);

if (existsSync(binPath)) {
  chmodSync(binPath, 0o755);
}
