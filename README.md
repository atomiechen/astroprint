# aprint

Astro-powered Markdown documents with normal web preview, paged preview, and WeasyPrint PDF export.

`aprint` intentionally leans on Astro instead of reimplementing a dev server, Markdown pipeline, asset handling, image optimization, or HMR.

## Quick Start

Add the integration to an Astro project:

```bash
npm create astro@latest my-docs
cd my-docs
npx astro add aprint
```

This installs `aprint` and updates `astro.config.mjs` with the default integration setup.
Use the equivalent `pnpm astro add`, `yarn astro add`, or `bunx astro add` command if your project uses another package manager.

With no options, `aprint()` only installs the Markdown directive pipeline. Use normal Astro pages and layouts when you want to control routes yourself:

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import aprint from "aprint";

export default defineConfig({
  integrations: [aprint()],
});
```

Add `routes` only when you want `aprint` to inject collection-backed normal and paged-preview routes. Add top-level `pdf` when you want `aprint pdf` to work without passing `--route`:

```js title="astro.config.mjs"
// astro.config.mjs
import { defineConfig } from "astro/config";
import aprint from "aprint";

export default defineConfig({
  integrations: [
    aprint({
      routes: [
        {
          collection: "cv",
          layout: "aprint/layouts/DocumentLayout.astro",
          route: "/aprint",
          previewRoute: "/aprint-preview",
          defaultId: "main",
        },
      ],
      pdf: {
        route: "/aprint",
        outputDir: "public",
        backend: "weasyprint",
      },
    }),
  ],
});
```

`aprint/astro` is also exported for projects that prefer an explicit integration subpath.

Define the content collection:

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cv = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/cv" }),
  schema: z.object({
    title: z.string().optional(),
    name: z.string().optional(),
    nameZh: z.string().optional(),
  }),
});

export const collections = { cv };
```

Run Astro for development:

```bash
npx astro dev
```

Then open:

- `/aprint/` for the normal document view
- `/aprint-preview/` for Paged.js pagination preview

Generate the final PDF:

```bash
npx aprint pdf
```

For manually routed pages, pass the route explicitly:

```bash
npx aprint pdf --route /cv-notes/
```

## Markdown Directives

`aprint` installs `remark-directive` and maps lightweight directives to semantic HTML classes:

```md
:::::two-column-list

::::entry
:::col
**Tsinghua University**

Ph.D. Candidate
:::

:::col
Beijing, China

2020-2026
:::
::::

:::::
```

The built-in academic CV theme styles these classes through `aprint/styles/academic-cv.css`, imported by `DocumentLayout.astro`.

## Custom Layouts

The built-in `DocumentLayout.astro` is only the default shell. It lives at `aprint/layouts/DocumentLayout.astro` and includes a small document nav and the paged preview wrapper. The document root and academic CV stylesheet live in `aprint/components/Document.astro`.

To integrate with your own site chrome, point a document at your own Astro layout:

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import aprint from "aprint";

export default defineConfig({
  integrations: [
    aprint({
      routes: [
        {
          collection: "cv",
          layout: "./src/layouts/MyDocumentLayout.astro",
          route: "/aprint",
          previewRoute: "/aprint-preview",
        },
      ],
    }),
  ],
});
```

Your layout receives the rendered Markdown as its slot, plus document props:

`PrintPreview.astro` is preview-only. Render it only when `printPreview` is true, and render the document directly for normal routes. If your layout has preview-only chrome styles, keep them in a top-level `<style is:inline data-preview-ignore>` block and pass a narrowed `styleSelector` so Paged.js receives document styles without the surrounding UI styles.

```astro title="src/layouts/MyDocumentLayout.astro"
---
import PrintPreview from "aprint/components/PrintPreview.astro";
import "aprint/styles/academic-cv.css";

const {
  title,
  secondaryTitle,
  normalHref,
  previewHref,
  printPreview = false,
  entry,
} = Astro.props;
---

<BaseLayout title={title}>
  <SiteNav />

  <a href={printPreview ? normalHref : previewHref}>
    {printPreview ? "Normal view" : "Paged preview"}
  </a>

  {
    printPreview ? (
      <PrintPreview
        documentSelector=".my-document"
        styleSelector="style:not([data-preview-ignore])"
        statusSelector="[data-preview-status]"
      >
        <main class="my-document">
          <h1>{title}</h1>
          {secondaryTitle && <p>{secondaryTitle}</p>}
          <slot />
        </main>
      </PrintPreview>
    ) : (
      <main class="my-document">
        <h1>{title}</h1>
        {secondaryTitle && <p>{secondaryTitle}</p>}
        <slot />
      </main>
    )
  }
</BaseLayout>
```

For a completely custom template, create your own layout and stylesheet, then use the directive classes generated by `aprint` (`.aprint-entry`, `.aprint-list--two-column`, and so on), or override the directive mapping with the integration `directives` option.

For standalone Markdown pages that should use the default document surface without generated document routes, navigation, paged preview, or PDF behavior, set the page frontmatter layout:

```md title="src/pages/cv-notes.md"
---
layout: aprint/layouts/DocumentMarkdownLayout.astro
title: CV Notes
secondaryTitle: Draft
---

:::::two-column-list

::::entry
:::col
**Example**
:::

:::col
2026
:::
::::

:::::
```

## Commands

```bash
aprint dev          # thin wrapper around astro dev
aprint build        # thin wrapper around astro build
aprint pdf          # Generate from the configured pdf.route
aprint pdf --route /cv-notes/  # Generate from a regular Astro route
aprint pdf --route /cv-notes/ --output-dir public
```

The PDF command sets `APRINT_RENDER_HTML=true` so injected routes are generated for export. Without top-level `pdf`, use `--route` to print an existing Astro page; `aprint` will not guess a default PDF route.

If a route config omits `route`, it is injected at `/aprint/{collection}` to avoid colliding with hand-written pages. `pdf.route` and `--route` accept either `/cv-notes` or `/cv-notes/`; `aprint` resolves both against Astro's static output and uses a trailing slash internally for directory routes so relative assets keep the same base URL.

`pdf.output`, `pdf.outputDir`, `--output`, and `--output-dir` are normal filesystem paths, not Astro routes. `outputDir` is the base directory, and `output` is resolved inside it. Absolute `output` paths are used as-is. Relative paths are resolved from the project root/current working directory. For example, `outputDir: "public"` plus `/cv-notes` writes `public/cv-notes.pdf`; `outputDir: "public"` plus `output: "CV.pdf"` writes `public/CV.pdf`.

CLI options override the matching config fields, so `--output-dir` overrides `pdf.outputDir`, and `--output` overrides `pdf.output`. If no output is specified, the filename is derived from the route: `/` becomes `index.pdf`, `/cv-notes` becomes `cv-notes.pdf`, and `/nested/report` becomes `report.pdf`. If `--port` is omitted, `aprint` asks the OS for an available temporary port; if `--port` is provided, that exact port is used.
