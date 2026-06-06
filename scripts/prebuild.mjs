#!/usr/bin/env node
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);

const syncVersion = () => {
  const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  const versionFile = new URL("src/version.ts", root);
  const source = `// Auto-generated from package.json\nexport const version = ${JSON.stringify(packageJson.version)};\n`;

  writeFileSync(versionFile, source, "utf8");
};

syncVersion();
rmSync(new URL("dist", root), { force: true, recursive: true });
