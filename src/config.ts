import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AstroPrintPdfConfig } from "./integration.js";

export type AstroPrintManifest = {
  pdf?: AstroPrintPdfConfig;
};

export const loadAstroPrintManifest = async (root = process.cwd()): Promise<AstroPrintManifest> => {
  const manifestPath = resolve(root, ".astro/integrations/astroprint/manifest.json");

  if (existsSync(manifestPath)) {
    return JSON.parse(await readFile(manifestPath, "utf-8")) as AstroPrintManifest;
  }

  return {};
};
