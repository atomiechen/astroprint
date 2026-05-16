import type { AstroIntegration } from "astro";
import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import remarkDirective from "remark-directive";

import { remarkBibtex, type RemarkBibtexOptions } from "../lib/remark-bibtex.js";
import { remarkAprintDirectives, type AprintDirectiveOptions } from "../lib/remark-aprint-directives.js";
import { remarkLogoLinkDirectives } from "../lib/remark-logo-link-directives.js";
import { remarkStripHtmlComments } from "../lib/remark-strip-html-comments.js";

export type AprintPdfConfig = {
  route: string;
  output?: string;
  outputDir?: string;
  backend?: "weasyprint" | "playwright";
};

export type AprintRouteConfig = {
  collection: string;
  layout?: string;
  route?: string;
  previewRoute?: string;
  defaultId?: string;
};

export type AprintAstroOptions = AprintDirectiveOptions & {
  routes?: AprintRouteConfig[];
  pdf?: AprintPdfConfig;
  bibtex?: boolean | RemarkBibtexOptions;
  stripHtmlComments?: boolean;
};

const normalizeRoute = (route: string) => route.replace(/\/$/, "") || "/";

export default function aprint(options: AprintAstroOptions = {}): AstroIntegration {
  const routes = options.routes ?? [];
  const pdf = options.pdf;
  const bibtex = options.bibtex ?? true;
  const stripHtmlComments = options.stripHtmlComments !== false;

  return {
    name: "aprint",
    hooks: {
      "astro:config:setup": ({ config, updateConfig, injectRoute, createCodegenDir }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [
              ...(config.markdown.remarkPlugins ?? []),
              remarkDirective,
              remarkLogoLinkDirectives,
              ...(bibtex ? [[remarkBibtex, typeof bibtex === "object" ? bibtex : {}]] : []),
              [remarkAprintDirectives, { directives: options.directives } satisfies AprintDirectiveOptions],
              ...(stripHtmlComments ? [remarkStripHtmlComments] : []),
            ],
          },
        });

        const codegenDir = createCodegenDir();

        for (const [index, routeConfig] of routes.entries()) {
          const name = `route-${index}`;
          const route = normalizeRoute(routeConfig.route ?? `/aprint/${routeConfig.collection}`);
          const defaultPreviewRoute = route === "/" ? "/preview" : `${route}-preview`;
          const previewRoute = normalizeRoute(routeConfig.previewRoute ?? defaultPreviewRoute);
          const generatedConfig = JSON.stringify({
            name,
            ...routeConfig,
            route,
            previewRoute,
          });
          const collection = routeConfig.collection;
          const layout = routeConfig.layout ?? "aprint/layouts/DocumentLayout.astro";
          const defaultId = routeConfig.defaultId ?? "main";
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

        writeFileSync(
          new URL("manifest.json", codegenDir),
          JSON.stringify({
            pdf,
          }),
          "utf-8",
        );
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
---

<DocumentLayout
  title={title}
  secondaryTitle={secondaryTitle}
  normalHref={normalHref}
  previewHref={previewHref}
  printPreview={printPreview}
  entry={entry}
  documentConfig={documentConfig}
>
  <Content />
</DocumentLayout>
`;
