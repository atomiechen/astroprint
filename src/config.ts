import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { AprintAstroOptions, AprintDocumentConfig } from "./astro/index.js";

export type LoadedAprintConfig = AprintAstroOptions & {
  root: string;
};

export const defaultDocuments: Record<string, AprintDocumentConfig> = {
  cv: {
    collection: "cv",
    route: "/aprint",
    previewRoute: "/aprint-preview",
    defaultId: "main",
    pdf: {
      output: "CV.pdf",
      backend: "weasyprint",
    },
  },
};

export const loadAprintConfig = async (root = process.cwd()): Promise<LoadedAprintConfig> => {
  const manifestPath = resolve(root, ".astro/integrations/aprint/manifest.json");

  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8")) as AprintAstroOptions;
    return {
      root,
      ...manifest,
    };
  }

  return {
    root,
    documents: defaultDocuments,
  };
};

export const getDocumentConfig = (
  config: LoadedAprintConfig,
  documentName?: string,
) => {
  const documents = config.documents ?? defaultDocuments;
  const name = documentName ?? Object.keys(documents)[0] ?? "cv";
  const document = documents[name];

  if (!document) {
    throw new Error(`Unknown aprint document "${name}".`);
  }

  return { name, document };
};

export const getDocumentRoute = (document: AprintDocumentConfig, id?: string) => {
  const defaultId = document.defaultId ?? "main";
  const route = (document.route ?? `/${document.collection}`).replace(/\/$/, "");
  return id && id !== defaultId ? `${route}/${id}/` : `${route}/`;
};
