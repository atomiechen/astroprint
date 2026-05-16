import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AprintPdfConfig } from "./astro/index.js";

export type AprintManifest = {
  pdf?: AprintPdfConfig;
};

export const loadAprintManifest = async (root = process.cwd()): Promise<AprintManifest> => {
  const manifestPath = resolve(root, ".astro/integrations/aprint/manifest.json");

  if (existsSync(manifestPath)) {
    return JSON.parse(await readFile(manifestPath, "utf-8")) as AprintManifest;
  }

  return {};
};
