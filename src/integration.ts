import type { AstroIntegration } from "astro";
import { writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import remarkDirective from "remark-directive";

import { remarkBibtex, type RemarkBibtexOptions } from "./lib/remark-bibtex.js";
import { remarkAstroPrintDirectives, type AstroPrintDirectiveOptions } from "./lib/remark-astroprint-directives.js";
import { remarkLogoLinkDirectives } from "./lib/remark-logo-link-directives.js";
import { remarkStripHtmlComments } from "./lib/remark-strip-html-comments.js";

export type AstroPrintPdfConfig = {
  route: string;
  document?: string;
  output?: string;
  outputDir?: string;
  backend?: "weasyprint" | "playwright";
};

type AstroPrintInjectedRouteBaseConfig = {
  layout?: string;
  route: string;
  previewRoute?: boolean | string;
  injectDuringBuild?: boolean;
};

export type AstroPrintCollectionRouteConfig = AstroPrintInjectedRouteBaseConfig & {
  collection: string;
  defaultId?: string;
  entry?: never;
  markdown?: never;
};

export type AstroPrintCollectionEntryRouteConfig = AstroPrintInjectedRouteBaseConfig & {
  collection: string;
  entry: string;
  defaultId?: never;
  markdown?: never;
};

export type AstroPrintMarkdownRouteConfig = AstroPrintInjectedRouteBaseConfig & {
  markdown: string;
  collection?: never;
  entry?: never;
  defaultId?: never;
};

export type AstroPrintInjectedRouteConfig =
  | AstroPrintCollectionRouteConfig
  | AstroPrintCollectionEntryRouteConfig
  | AstroPrintMarkdownRouteConfig;

export type AstroPrintAstroOptions = AstroPrintDirectiveOptions & {
  injectedRoutes?: AstroPrintInjectedRouteConfig[];
  pdf?: AstroPrintPdfConfig;
  bibtex?: boolean | RemarkBibtexOptions;
  stripHtmlComments?: boolean;
};

const normalizeRoute = (route: string) => route.replace(/\/$/, "") || "/";
const astroprintWatchIgnore = "**/.astroprint*/**";

const resolvePreviewRoute = (previewRoute: boolean | string | undefined, route: string) => {
  if (previewRoute === true) {
    return route === "/" ? "/preview" : `${route}-preview`;
  }

  if (typeof previewRoute === "string") {
    return normalizeRoute(previewRoute);
  }

  return undefined;
};

const isPathSpecifier = (specifier: string) =>
  specifier.startsWith("./") || specifier.startsWith("../") || isAbsolute(specifier);

const toImportPath = (path: string) => {
  const normalized = path.replaceAll("\\", "/");
  return normalized.startsWith(".") ? normalized : `./${normalized}`;
};

const resolveImportSpecifier = ({
  specifier,
  root,
  importer,
}: {
  specifier: string;
  root: URL;
  importer: URL;
}) => {
  if (!isPathSpecifier(specifier)) return specifier;

  const importerDir = dirname(fileURLToPath(importer));
  const specifierUrl = isAbsolute(specifier) ? pathToFileURL(specifier) : new URL(specifier, root);
  return toImportPath(relative(importerDir, fileURLToPath(specifierUrl)));
};

const hasAstroprintWatchIgnore = (ignored: unknown) =>
  Array.isArray(ignored) ? ignored.includes(astroprintWatchIgnore) : ignored === astroprintWatchIgnore;

export default function astroprint(options: AstroPrintAstroOptions = {}): AstroIntegration {
  const injectedRoutes = options.injectedRoutes ?? [];
  const pdf = options.pdf;
  const bibtex = options.bibtex ?? true;
  const stripHtmlComments = options.stripHtmlComments !== false;

  return {
    name: "astroprint",
    hooks: {
      "astro:config:setup": ({ config, command, updateConfig, injectRoute, createCodegenDir }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [
              ...(config.markdown.remarkPlugins ?? []),
              remarkDirective,
              remarkLogoLinkDirectives,
              ...(bibtex ? [[remarkBibtex, typeof bibtex === "object" ? bibtex : {}]] : []),
              [remarkAstroPrintDirectives, { directives: options.directives } satisfies AstroPrintDirectiveOptions],
              ...(stripHtmlComments ? [remarkStripHtmlComments] : []),
            ],
          },
          vite: {
            server: {
              watch: {
                ignored: hasAstroprintWatchIgnore(config.vite.server?.watch?.ignored) ? [] : [astroprintWatchIgnore],
              },
            },
          },
        });

        const codegenDir = createCodegenDir();
        const isPdfRenderBuild = process.env.ASTROPRINT_RENDER_HTML === "true";

        for (const [index, routeConfig] of injectedRoutes.entries()) {
          const shouldInjectRoute =
            command === "dev" || isPdfRenderBuild || (command === "build" && routeConfig.injectDuringBuild !== false);

          if (shouldInjectRoute) {
            const name = `route-${index}`;
            const route = normalizeRoute(routeConfig.route);
            const previewRoute = resolvePreviewRoute(routeConfig.previewRoute, route);
            const generatedConfig = JSON.stringify({
              name,
              ...routeConfig,
              route,
              previewRoute,
            });
            const layout = routeConfig.layout ?? "astroprint/layouts/AcademicLayout.astro";
            const configFile = new URL(`${name}.json`, codegenDir);
            const normalEntrypoint = new URL(`${name}.astro`, codegenDir);
            const normalLayout = resolveImportSpecifier({
              specifier: layout,
              root: config.root,
              importer: normalEntrypoint,
            });
            const normalRouteEntrypoint = createRouteEntrypoint({
              routeConfig,
              configFileName: basename(fileURLToPath(configFile)),
              layout: normalLayout,
              pattern: route,
              printPreview: false,
              root: config.root,
              importer: normalEntrypoint,
            });

            writeFileSync(configFile, generatedConfig, "utf-8");
            writeFileSync(normalEntrypoint, normalRouteEntrypoint.source, "utf-8");

            injectRoute({
              pattern: normalRouteEntrypoint.pattern,
              entrypoint: normalEntrypoint,
            });

            if (previewRoute) {
              const previewEntrypoint = new URL(`${name}-preview.astro`, codegenDir);
              const previewLayout = resolveImportSpecifier({
                specifier: layout,
                root: config.root,
                importer: previewEntrypoint,
              });
              const previewRouteEntrypoint = createRouteEntrypoint({
                routeConfig,
                configFileName: basename(fileURLToPath(configFile)),
                layout: previewLayout,
                pattern: previewRoute,
                printPreview: true,
                root: config.root,
                importer: previewEntrypoint,
              });

              writeFileSync(previewEntrypoint, previewRouteEntrypoint.source, "utf-8");

              injectRoute({
                pattern: previewRouteEntrypoint.pattern,
                entrypoint: previewEntrypoint,
              });
            }
          }
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

const routeHref = (routeExpression: string) => `(${routeExpression} === "/" ? "/" : \`\${${routeExpression}}/\`)`;

const createRouteEntrypoint = ({
  routeConfig,
  configFileName,
  layout,
  pattern,
  printPreview,
  root,
  importer,
}: {
  routeConfig: AstroPrintInjectedRouteConfig;
  configFileName: string;
  layout: string;
  pattern: string;
  printPreview: boolean;
  root: URL;
  importer: URL;
}) => {
  if (typeof routeConfig.markdown === "string") {
    return createMarkdownRouteEntrypoint({
      configFileName,
      layout,
      markdown: resolveImportSpecifier({
        specifier: routeConfig.markdown,
        root,
        importer,
      }),
      pattern,
      printPreview,
    });
  }

  if (typeof routeConfig.entry === "string") {
    return createCollectionEntryRouteEntrypoint({
      collection: routeConfig.collection,
      configFileName,
      entry: routeConfig.entry,
      layout,
      pattern,
      printPreview,
    });
  }

  return createCollectionRouteEntrypoint({
    collection: routeConfig.collection,
    configFileName,
    defaultId: routeConfig.defaultId ?? "main",
    layout,
    pattern,
    printPreview,
  });
};

const createCollectionRouteEntrypoint = ({
  collection,
  configFileName,
  defaultId,
  layout,
  pattern,
  printPreview,
}: {
  collection: string;
  configFileName: string;
  defaultId: string;
  layout: string;
  pattern: string;
  printPreview: boolean;
}) => ({
  pattern: `${pattern}/[...document]`,
  source: `---
import { getCollection, render } from "astro:content";
import RouteLayout from ${JSON.stringify(layout)};
import documentConfig from "./${configFileName}";

const printPreview = ${String(printPreview)};
const route = documentConfig.route;
const previewRoute = documentConfig.previewRoute;
const defaultId = ${JSON.stringify(defaultId)};

export async function getStaticPaths() {
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
const suffix = entry.id === defaultId ? "/" : \`/\${entry.id}/\`;
const normalHref = \`\${route}\${suffix}\`;
const previewHref = previewRoute ? \`\${previewRoute}\${suffix}\` : undefined;
---

<RouteLayout
  withRouteShell={true}
  normalHref={normalHref}
  previewHref={previewHref}
  printPreview={printPreview}
  entry={entry}
  documentConfig={documentConfig}
>
  <Content />
</RouteLayout>
`,
});

const createCollectionEntryRouteEntrypoint = ({
  collection,
  configFileName,
  entry,
  layout,
  pattern,
  printPreview,
}: {
  collection: string;
  configFileName: string;
  entry: string;
  layout: string;
  pattern: string;
  printPreview: boolean;
}) => ({
  pattern,
  source: `---
import { getEntry, render } from "astro:content";
import RouteLayout from ${JSON.stringify(layout)};
import documentConfig from "./${configFileName}";

const printPreview = ${String(printPreview)};
const route = documentConfig.route;
const previewRoute = documentConfig.previewRoute;
const entry = await getEntry(${JSON.stringify(collection)}, ${JSON.stringify(entry)});

if (!entry) {
  throw new Error(\`astroprint could not find collection entry "${JSON.stringify(collection).slice(1, -1)}/${JSON.stringify(entry).slice(1, -1)}".\`);
}

const { Content } = await render(entry);
const normalHref = ${routeHref("route")};
const previewHref = previewRoute ? ${routeHref("previewRoute")} : undefined;
---

<RouteLayout
  withRouteShell={true}
  normalHref={normalHref}
  previewHref={previewHref}
  printPreview={printPreview}
  entry={entry}
  documentConfig={documentConfig}
>
  <Content />
</RouteLayout>
`,
});

const createMarkdownRouteEntrypoint = ({
  configFileName,
  layout,
  markdown,
  pattern,
  printPreview,
}: {
  configFileName: string;
  layout: string;
  markdown: string;
  pattern: string;
  printPreview: boolean;
}) => ({
  pattern,
  source: `---
import RouteLayout from ${JSON.stringify(layout)};
import { Content, frontmatter } from ${JSON.stringify(markdown)};
import documentConfig from "./${configFileName}";

const printPreview = ${String(printPreview)};
const route = documentConfig.route;
const previewRoute = documentConfig.previewRoute;
const normalHref = ${routeHref("route")};
const previewHref = previewRoute ? ${routeHref("previewRoute")} : undefined;
---

<RouteLayout
  withRouteShell={true}
  normalHref={normalHref}
  previewHref={previewHref}
  printPreview={printPreview}
  frontmatter={frontmatter}
  documentConfig={documentConfig}
>
  <Content />
</RouteLayout>
`,
});
