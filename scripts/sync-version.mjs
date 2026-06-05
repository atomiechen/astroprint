#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const versionFile = new URL("src/version.ts", root);
const source = `// Auto-generated from package.json\nexport const version = ${JSON.stringify(packageJson.version)};\n`;

writeFileSync(versionFile, source, "utf8");
