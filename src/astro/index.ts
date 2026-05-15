import type { AstroIntegration } from "astro";
import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import remarkDirective from "remark-directive";

import { remarkAprintDirectives, type AprintDirectiveOptions } from "../lib/remark-aprint-directives.js";

export type AprintDocumentConfig = {
  collection: string;
  layout?: string;
  route?: string;
  previewRoute?: string;
  defaultId?: string;
  pdf?: {
    output?: string;
    backend?: "weasyprint" | "playwright";
  };
};

export type AprintAstroOptions = AprintDirectiveOptions & {
  documents?: Record<string, AprintDocumentConfig>;
};

const defaultDocuments: Record<string, AprintDocumentConfig> = {
  cv: {
    collection: "cv",
    layout: "aprint/layouts/DocumentLayout.astro",
    route: "/aprint",
    previewRoute: "/aprint-preview",
    defaultId: "main",
    pdf: {
      output: "CV.pdf",
      backend: "weasyprint",
    },
  },
};

const normalizeRoute = (route: string) => route.replace(/\/$/, "") || "/";

export default function aprint(options: AprintAstroOptions = {}): AstroIntegration {
  const documents = options.documents ?? defaultDocuments;

  return {
    name: "aprint",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute, createCodegenDir }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [
              ...(config.markdown.remarkPlugins ?? []),
              remarkDirective,
              [remarkAprintDirectives, { directives: options.directives }],
            ],
          },
        });

        const codegenDir = createCodegenDir();
        const manifest: Record<string, AprintDocumentConfig & { route: string; previewRoute: string }> = {};

        for (const [name, documentConfig] of Object.entries(documents)) {
          const route = normalizeRoute(documentConfig.route ?? `/${name}`);
          const previewRoute = normalizeRoute(documentConfig.previewRoute ?? `/${name}-preview`);
          manifest[name] = {
            ...documentConfig,
            route,
            previewRoute,
          };
          const generatedConfig = JSON.stringify({
            name,
            ...documentConfig,
            route,
            previewRoute,
          });
          const collection = documentConfig.collection;
          const layout = documentConfig.layout ?? "aprint/layouts/DocumentLayout.astro";
          const defaultId = documentConfig.defaultId ?? "main";
          const configFile = new URL(`${name}.json`, codegenDir);
          const normalEntrypoint = new URL(`${name}.astro`, codegenDir);
          const previewEntrypoint = new URL(`${name}-preview.astro`, codegenDir);

          writeFileSync(configFile, generatedConfig, "utf-8");
          writeFileSync(
            normalEntrypoint,
            createRouteEntrypoint({
              configFileName: basename(configFile.pathname),
              collection,
              layout,
              defaultId,
              printPreview: false,
            }),
            "utf-8",
          );
          writeFileSync(
            previewEntrypoint,
            createRouteEntrypoint({
              configFileName: basename(configFile.pathname),
              collection,
              layout,
              defaultId,
              printPreview: true,
            }),
            "utf-8",
          );

          injectRoute({
            pattern: `${route}/[...document]`,
            entrypoint: normalEntrypoint,
          });
          injectRoute({
            pattern: `${previewRoute}/[...document]`,
            entrypoint: previewEntrypoint,
          });
        }

        writeFileSync(new URL("manifest.json", codegenDir), JSON.stringify({ documents: manifest }), "utf-8");
      },
    },
  };
}

const createRouteEntrypoint = ({
  configFileName,
  collection,
  layout,
  defaultId,
  printPreview,
}: {
  configFileName: string;
  collection: string;
  layout: string;
  defaultId: string;
  printPreview: boolean;
}) => `---
import { getCollection, render } from "astro:content";
import DocumentLayout from ${JSON.stringify(layout)};
import documentConfig from "./${configFileName}";

const printPreview = ${String(printPreview)};
const route = documentConfig.route;
const previewRoute = documentConfig.previewRoute;
const defaultId = ${JSON.stringify(defaultId)};

export async function getStaticPaths() {
  const shouldGenerate = import.meta.env.DEV || process.env.APRINT_RENDER_HTML === "true";
  if (!shouldGenerate) return [];

  const entries = await getCollection(${JSON.stringify(collection)});
  const defaultDocumentId = ${JSON.stringify(defaultId)};
  return entries.map((entry) => ({
    params: {
      document: entry.id === defaultDocumentId ? undefined : entry.id,
    },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const title = entry.data.title ?? entry.data.name ?? entry.id;
const secondaryTitle = entry.data.nameZh;
const suffix = entry.id === defaultId ? "/" : \`/\${entry.id}/\`;
const normalHref = \`\${route}\${suffix}\`;
const previewHref = \`\${previewRoute}\${suffix}\`;
const pdfHref = \`/\${documentConfig.pdf?.output ?? \`\${entry.id}.pdf\`}\`;
---

<DocumentLayout
  title={title}
  secondaryTitle={secondaryTitle}
  normalHref={normalHref}
  previewHref={previewHref}
  pdfHref={pdfHref}
  printPreview={printPreview}
  entry={entry}
  documentConfig={documentConfig}
>
  <Content />
</DocumentLayout>
`;
