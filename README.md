# aprint — print-ready Markdown for Astro

Print-ready Markdown documents for [Astro](https://astro.build/), with normal web preview, Paged.js preview, and PDF export.

Use `aprint` for CVs, reports, notes, and other Markdown-first documents that should stay editable as Astro pages while still exporting clean PDFs. It uses Astro's content, layout, asset, and dev-server behavior, then adds print-oriented Markdown transforms, optional document routes, paged preview, and a PDF CLI.

## Quick Start

Add the integration to an Astro project:

```bash
npm create astro@latest my-docs
cd my-docs
npx astro add aprint
```

This installs `aprint` and updates `astro.config.mjs` with the default integration setup.
Use the equivalent `pnpm astro add`, `yarn astro add`, or `bunx astro add` command if your project uses another package manager.

`aprint` currently targets Node 20+ and Astro 5.

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
          layout: "aprint/layouts/AcademicLayout.astro",
          route: "/aprint",
          previewRoute: "/aprint-preview",
          defaultId: "main",
          // Optional. Defaults to true for normal astro build.
          injectDuringBuild: false,
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

By default, configured routes are injected during normal `astro build`, so `/aprint/` and `/aprint-preview/` can be part of your production site. Set `injectDuringBuild: false` on a route when you only want it during `astro dev` and `aprint pdf`; the PDF command always enables route injection internally with `APRINT_RENDER_HTML=true`.

Define the content collection:

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const cv = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/cv" }),
  schema: z.object({
    title: z.string().optional(),
    secondaryTitle: z.string().optional(),
  }),
});

export const collections = { cv };
```

The generated route passes the raw collection `entry` to the configured layout. The built-in academic layout maps `title`/`secondaryTitle`; custom layouts can use any frontmatter shape.

Add at least one Markdown file to the collection:

```md title="src/content/cv/main.md"
---
title: Ada Lovelace
secondaryTitle: Computing Notes
---

:::::ul{.two-col}

::::entry
:::col
**Example University**
:::

:::col
2026
:::
::::

:::::
```

The filename becomes the document id. This example uses `main.md` because the route config above sets `defaultId: "main"`, so it renders at `/aprint/`. Other ids render at paths such as `/aprint/example/`, or you can change `defaultId`.

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

Supported PDF backends:

| Backend | Install |
| --- | --- |
| `weasyprint` (default) | Install the `weasyprint` command for your platform. See the [WeasyPrint installation guide](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation). |
| `playwright` | Install Playwright and a browser for your environment. See the [Playwright browser installation guide](https://playwright.dev/docs/browsers). |

For `weasyprint`, set `WEASYPRINT_BIN=/path/to/weasyprint` when the executable is not named `weasyprint` or is not on `PATH`.

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

`aprint` separates document structure from route chrome. `aprint/components/Document.astro` provides the default document root and baseline page styles. `aprint/layouts/PreviewLayout.astro` provides the generated route chrome, print button, document `<title>`, and paged-preview branching.

When a custom theme wraps `PreviewLayout.astro`, it mainly needs to map collection data into markup and import its own stylesheet:

```astro title="src/layouts/MyThemedDocumentLayout.astro"
---
import type { ComponentProps } from "astro/types";
import Document from "aprint/components/Document.astro";
import PreviewLayout from "aprint/layouts/PreviewLayout.astro";
import "./my-document.css";

type Props = ComponentProps<typeof PreviewLayout> & {
  secondaryTitle?: string;
  entry?: {
    id?: string;
    data?: Record<string, unknown>;
  };
};

const { entry } = Astro.props;
const title =
  Astro.props.title ??
  (typeof entry?.data?.title === "string" ? entry.data.title : undefined) ??
  entry?.id;
const secondaryTitle =
  Astro.props.secondaryTitle ??
  (typeof entry?.data?.secondaryTitle === "string" ? entry.data.secondaryTitle : undefined);
---

<PreviewLayout {...Astro.props} pageTitle={title}>
  <Document>
    <h1 class="my-title">
      <span>{title}</span>
      {secondaryTitle && <span>{secondaryTitle}</span>}
    </h1>
    <slot />
  </Document>
</PreviewLayout>
```

Then point the generated route at that layout:

```js title="astro.config.mjs"
import { defineConfig } from "astro/config";
import aprint from "aprint";

export default defineConfig({
  integrations: [
    aprint({
      routes: [
        {
          collection: "cv",
          layout: "./src/layouts/MyThemedDocumentLayout.astro",
          route: "/aprint",
          previewRoute: "/aprint-preview",
        },
      ],
    }),
  ],
});
```

Relative `layout` paths are resolved from your Astro project root. Package specifiers and aliases, such as `aprint/layouts/PreviewLayout.astro` or `@/layouts/MyDocumentLayout.astro`, are passed through to Astro/Vite. The generated route passes rendered Markdown as the slot, plus route props such as `normalHref`, `previewHref`, `printPreview`, `entry`, and `documentConfig`.

For a completely custom template, create your own layout and stylesheet, then use the directive classes generated by `aprint` (`.aprint-entry`, `.two-col`, and so on), or extend the directive mapping with the integration `directives` option.

For standalone Markdown pages that should use the built-in academic document surface without generated document routes, navigation, paged preview, or PDF behavior, set the page frontmatter layout. The academic layout defaults to `BaseLayout.astro`; generated routes pass `preview={true}` to use `PreviewLayout.astro`.

```md title="src/pages/cv-notes.md"
---
layout: aprint/layouts/AcademicLayout.astro
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
aprint pdf mydoc    # Generate from pdf.route plus /mydoc/
aprint pdf a/b/c    # Generate from pdf.route plus /a/b/c/
aprint pdf --route /cv-notes/  # Generate from a regular Astro route
aprint pdf --route /cv-notes/ --output-dir public
```

The PDF command sets `APRINT_RENDER_HTML=true` so injected routes are generated for export, regardless of each route's `injectDuringBuild` setting. Without top-level `pdf`, use `--route` to print an existing Astro page; `aprint` will not guess a default PDF route.

`npx aprint ...` runs the `aprint` CLI, but the Playwright backend imports the `playwright` package from the project at runtime. Install Playwright in the project when using `backend: "playwright"`; `npx playwright ...` is useful for Playwright's own install/setup commands, but it does not replace the runtime dependency.

If a route config omits `route`, it is injected at `/aprint/{collection}` to avoid colliding with hand-written pages. `pdf.route` and `--route` accept either `/cv-notes` or `/cv-notes/`; `aprint` resolves both against Astro's static output and uses a trailing slash internally for directory routes so relative assets keep the same base URL. `pdf.document` and the optional `aprint pdf [document]` positional argument append a document path to the selected route, so `pdf.route: "/cv"` plus `aprint pdf mydoc` prints `/cv/mydoc/`. The positional argument overrides `pdf.document`; omit it to print the base route as before.

`pdf.output`, `pdf.outputDir`, `--output`, and `--output-dir` are normal filesystem paths, not Astro routes. `outputDir` is the base directory, and `output` is resolved inside it. Absolute `output` paths are used as-is. Relative paths are resolved from the project root/current working directory. For example, `outputDir: "public"` plus `/cv-notes` writes `public/cv-notes.pdf`; `outputDir: "public"` plus `output: "CV.pdf"` writes `public/CV.pdf`.

CLI options override the matching config fields, so `--backend` overrides `pdf.backend`, `--output-dir` overrides `pdf.outputDir`, and `--output` overrides `pdf.output`. If no output is specified, the filename is derived from the route: `/` becomes `index.pdf`, `/cv-notes` becomes `cv-notes.pdf`, and `/nested/report` becomes `report.pdf`. If `--port` is omitted, `aprint` asks the OS for an available temporary port; if `--port` is provided, that exact port is used.

## Maintainers

Maintainer notes, including the vendored Paged.js refresh workflow, live in [`AGENTS.md`](https://github.com/atomiechen/aprint/blob/main/AGENTS.md).
