# aprint

Astro-powered Markdown documents with normal web preview, paged preview, and PDF export.

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

With no options, `aprint()` only installs Markdown processing plugins for directives, `:logolink`, BibTeX conversion, and HTML comment stripping. Use normal Astro pages and layouts when you want to control routes yourself:

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
          layout: "aprint/layouts/AcademicDocumentLayout.astro",
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
:::::ul{.two-col}

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

The built-in academic CV theme styles these classes through `aprint/styles/academic-cv.css`, imported by the academic layouts. Treat directives and CSS as a pair: directives give Markdown a small semantic vocabulary, and the stylesheet defines how that vocabulary renders.

Use directive attributes for CSS classes, for example `:::::ul{.two-col}`. The bracket form is directive label/content syntax, so `:::ul[two-col]` is not recommended for classes.

You can add your own vocabulary through the integration `directives` option:

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import aprint from "aprint";

export default defineConfig({
  integrations: [
    aprint({
      directives: {
        callout: {
          tag: "aside",
          className: "my-callout",
        },
        timeline: {
          tag: "ol",
          className: "my-timeline",
        },
      },
    }),
  ],
});
```

Then provide matching CSS from your layout or theme stylesheet.

HTML comments in Markdown are stripped by default. Set `stripHtmlComments: false` in the integration options when you need comments to remain in the rendered HTML.

BibTeX code blocks with `style=acm`, `style=apa`, or `style=ieee` are converted to publication HTML at build time:

````md
```bibtex style=acm
@inproceedings{example,
  author = {Ada Lovelace and Grace Hopper},
  title = {Computing Notes},
  year = {2026},
  booktitle = {Proceedings of Example Conference}
}
```
````

Set `bibtex: false` to leave BibTeX code blocks untouched, or pass `bibtex: { style: "apa", highlightedAuthors: ["Ada Lovelace"] }` to set global defaults. Local code-block meta wins over global options, so `style=ieee highlight="Ada Lovelace"` can configure one BibTeX block. Style names are case-insensitive. `acm` uses a built-in ACM DL-like formatter; `apa` and `ieee` use bundled CSL styles from the Citation Style Language styles repository. Pass `lang` globally or in code-block meta, for example `style=apa lang=en-US`, when a CSL-backed style should use a specific locale.

## Custom Layouts

`aprint` separates document structure from theme CSS. `aprint/components/Document.astro` owns the default document root and title markup, and imports `aprint/styles/base.css` for baseline page variables and neutral document root styles. `aprint/layouts/DocumentLayout.astro` owns the navigation, print button, and paged preview branching.

The built-in academic theme uses the same extension path a user would use: `aprint/layouts/AcademicDocumentLayout.astro` imports `aprint/styles/academic-cv.css`, then renders `DocumentLayout.astro`. The academic stylesheet overrides base variables and adds theme-specific document styling. The default generated route uses this academic layout.

When a custom theme wraps `DocumentLayout.astro`, it only needs to import its own stylesheet. `DocumentLayout.astro` renders `Document.astro`, and `Document.astro` already imports `base.css`.

```astro title="src/layouts/MyThemedDocumentLayout.astro"
---
import type { ComponentProps } from "astro/types";
import DocumentLayout from "aprint/layouts/DocumentLayout.astro";
import "./my-document.css";

type Props = ComponentProps<typeof DocumentLayout>;
---

<DocumentLayout {...Astro.props}>
  <slot />
</DocumentLayout>
```

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

Relative `layout` paths are resolved from your Astro project root, so `./src/layouts/MyDocumentLayout.astro` means the same thing it would mean from `astro.config.mjs`. Package specifiers and aliases, such as `aprint/layouts/DocumentLayout.astro` or `@/layouts/MyDocumentLayout.astro`, are passed through to Astro/Vite.

Your layout receives the rendered Markdown as its slot, plus document props:

`PrintPreview.astro` is preview-only. Render it only when `printPreview` is true, and render the document directly for normal routes. If you render your own document root instead of `Document.astro`, import `aprint/styles/base.css` or define equivalent page variables and `@page` rules yourself. If your layout has preview-only chrome styles, keep them in a top-level `<style is:inline data-preview-ignore>` block and pass a narrowed `styleSelector` so Paged.js receives document styles without the surrounding UI styles.

```astro title="src/layouts/MyDocumentLayout.astro"
---
import PrintPreview from "aprint/components/PrintPreview.astro";
import "aprint/styles/base.css";
import "./my-document.css";

const {
  title,
  secondaryTitle,
  normalHref,
  previewHref,
  printPreview = false,
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

For a completely custom template, create your own layout and stylesheet, then use the directive classes generated by `aprint` (`.aprint-entry`, `.two-col`, and so on), or extend the directive mapping with the integration `directives` option.

For standalone Markdown pages that should use the built-in academic document surface without generated document routes, navigation, paged preview, or PDF behavior, set the page frontmatter layout:

```md title="src/pages/cv-notes.md"
---
layout: aprint/layouts/AcademicMarkdownLayout.astro
title: CV Notes
secondaryTitle: Draft
---

:::::ul{.two-col}

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

CLI options override the matching config fields, so `--backend` overrides `pdf.backend`, `--output-dir` overrides `pdf.outputDir`, and `--output` overrides `pdf.output`. If no output is specified, the filename is derived from the route: `/` becomes `index.pdf`, `/cv-notes` becomes `cv-notes.pdf`, and `/nested/report` becomes `report.pdf`. If `--port` is omitted, `aprint` asks the OS for an available temporary port; if `--port` is provided, that exact port is used.
