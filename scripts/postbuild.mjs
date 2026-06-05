#!/usr/bin/env node
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const toUrl = (path) => new URL(path, root);

const copy = (from, to) => {
  rmSync(toUrl(to), { force: true, recursive: true });
  mkdirSync(toUrl(`${to}/..`), { recursive: true });
  cpSync(toUrl(from), toUrl(to), { recursive: true });
};

for (const assetPath of packageJson.aprint?.assets ?? []) {
  copy(`src/${assetPath}`, `dist/${assetPath}`);
}

const binPath = toUrl("dist/cli.js");
if (existsSync(binPath)) {
  chmodSync(binPath, 0o755);
}
