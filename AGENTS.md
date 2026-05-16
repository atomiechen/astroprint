# AGENTS.md

## Project Overview

`aprint` is an Astro integration for Markdown-first documents with normal web preview, Paged.js browser preview, and PDF export.

Calling `aprint()` with no options should only install the Markdown processing pipeline: directives, the built-in `:logolink` transform, BibTeX conversion, and HTML comment stripping. Do not inject collection routes unless the user explicitly configures `routes`, and do not set a default PDF target unless the user configures top-level `pdf`. `routes` is a list, not a keyed object; PDF generation is configured separately through top-level `pdf`.

When a route config omits `route`, the default route is `/aprint/{collection}`. PDF output paths are resolved as normal filesystem paths: `outputDir` is the base directory and `output` is resolved inside it, with absolute `output` paths used as-is. When the CLI omits `--port`, the temporary server should bind to an OS-assigned free port.

The package code lives in `src/`. Built-in Astro surfaces live under `src/astro/`:

- `src/astro/components/Document.astro` is the theme-neutral default document root and title markup.
- `src/astro/layouts/DocumentLayout.astro` is the theme-neutral document shell with navigation, print button, preview status, and preview branching.
- `src/astro/layouts/AcademicDocumentLayout.astro` is the built-in academic route layout; it imports the academic CV theme and wraps `DocumentLayout.astro`.
- `src/astro/layouts/DocumentMarkdownLayout.astro` is the theme-neutral lightweight layout for standalone Markdown pages that want the default document root.
- `src/astro/layouts/AcademicMarkdownLayout.astro` is the built-in academic standalone Markdown layout; it imports the academic CV theme and wraps `DocumentMarkdownLayout.astro`.
- `src/astro/components/PrintPreview.astro` is the document-agnostic Paged.js preview wrapper.
- `src/astro/styles/base.css` defines the required baseline page, typography, and preview CSS variables plus neutral document root styles.
- `src/astro/styles/academic-cv.css` is the built-in academic CV document theme.

The playground content lives under `playground/` and is useful for local validation.

## Markdown Directives

`remark-directive` is installed by the integration. `remarkAprintDirectives` should keep directives generic: known list aliases map to semantic tags (`ul`, `ol`, `li`, `entry`), unknown text directives default to `span`, and unknown leaf/container directives default to `div`. All directives get a default `aprint-{name}` class unless the caller overrides that directive with `directives`.

Directive attributes should pass through to rendered HTML properties. Prefer standard directive attribute syntax for classes:

```md
:::::ul{.two-col}

::::entry
...
::::

:::::
```

Do not require a temporary `directives` entry in `astro.config.mjs` for the built-in two-column list styling. `[two-col]` is directive label/content syntax, not the preferred way to express a class.

The `:logolink[...]` directive is handled by `src/lib/remark-logo-link-directives.ts` before the generic directive mapper. Keep specialized transforms like this separate from the generic mapper when they need to rewrite the Markdown AST.

BibTeX code blocks are handled by `src/lib/remark-bibtex.ts` before the generic directive mapper. A fenced code block with `bibtex` as the language and `style=acm`, `style=apa`, or `style=ieee` in the meta string is converted into publication HTML using `src/lib/bib.ts` and Citation.js. `acm` uses the built-in ACM DL-like formatter; `apa` and `ieee` use bundled CSL styles under `src/lib/csl/`. Style names are case-insensitive. Local code-block meta wins over global `bibtex` options. The integration enables this by default; callers can set `bibtex: false` or pass `bibtex` options.

HTML comment removal is handled separately by `src/lib/remark-strip-html-comments.ts`. The integration keeps it on by default for current behavior, and callers can set `stripHtmlComments: false` when they need Markdown HTML comments to survive.

## Commands

- Install dependencies: `npm install`
- Type-check package and playground: `npm run check`
- Build package output: `npm run build`
- Run the Astro playground dev server: `npm run dev`
- Generate a configured PDF through the CLI: `npm run pdf`
- Generate a manual page-route PDF through the CLI: `npm run pdf -- --route /`

For validating injected document routes in a static build, run:

```bash
APRINT_RENDER_HTML=true npx astro build --outDir .aprint-check
```

Remove generated validation output afterward. Do not edit `.astro/`, `.aprint/`, `.aprint-check/`, `dist/`, `site-dist/`, or `public/` as source files.

## Print Preview

`PrintPreview.astro` is preview-only. Callers should render it only when they want Paged.js preview mode and render their document directly otherwise.

It wraps slotted document content, feeds selected page styles to Paged.js, and requires an explicit `documentSelector` prop. Callers may also pass `styleSelector`, `statusSelector`, and `readyEvent`. `styleSelector` defaults to `style` and should be narrowed when callers need to exclude preview chrome styles.

The component script initializes all `.print-preview-source` instances because Astro may emit the component script once per page even when the component appears multiple times.

Callers must define page variables on the document or `:root`:

- `--aprint-page-width`
- `--aprint-page-height`
- `--aprint-page-margin-top`
- `--aprint-page-margin-x`
- `--aprint-page-margin-bottom`

`--aprint-print-preview-top-offset` is optional.

Paged.js receives all linked stylesheets plus inline styles matched by `styleSelector`, after PrintPreview's internal `data-print-preview-ignore` style is removed. Caller-owned preview chrome styles should be kept in a top-level `<style is:inline data-preview-ignore>` block and excluded with `styleSelector="style:not([data-preview-ignore])"`.

## Astro Style Rules

Astro style handling is subtle. A top-level `<style>` without `is:inline` is an Astro style block: it is moved into processed CSS output, defaults to scoped CSS unless `is:global` is present, and tag-level runtime attributes such as `media` and `data-*` are not preserved.

A top-level `<style is:inline ...>` is emitted in place as a real HTML style element. `is:inline` is removed, while attributes such as `media` and `data-*` are preserved.

A `<style>` inside an expression is also emitted in place. `is:inline` is removed if present, but `is:global` is not treated as an Astro directive and can leak as an HTML attribute.

Put media conditions for processed Astro styles inside the CSS block as `@media ... {}`. If a style tag must keep runtime attributes in the final DOM, for example `data-preview-ignore`, use a small top-level `<style is:inline ...>` block.

## Layout Boundaries

Keep document styles and preview chrome styles separate:

- `base.css` should define baseline variables and neutral document root behavior that every theme can inherit or override.
- `academic-cv.css` should override baseline variables and style document content for the built-in academic theme.
- `Document.astro` should own only theme-neutral document root and title markup and may import `base.css`; do not import theme CSS from it.
- `DocumentLayout.astro` should own only the theme-neutral navigation, print button, preview status, preview branching, and caller-owned preview chrome styles. Theme wrappers should import their own CSS and render this layout; they should not re-import `base.css` because `Document.astro` already does that.
- `AcademicDocumentLayout.astro` should remain a thin academic theme wrapper around `DocumentLayout.astro`.
- `DocumentMarkdownLayout.astro` should stay a lightweight theme-neutral Markdown-page path: it wraps content in `Document.astro` and does not add generated routes, navigation, preview, PDF behavior, or theme CSS.
- `AcademicMarkdownLayout.astro` should remain a thin academic theme wrapper around `DocumentMarkdownLayout.astro`.
- `PrintPreview.astro` should remain document-agnostic and should not depend on `.aprint-document` beyond what callers pass through `documentSelector`. Layouts that render their own document root without `Document.astro` should import `base.css` or define equivalent page variables and `@page` rules.

Standalone Markdown pages can opt into the built-in academic document surface with:

```md
---
layout: aprint/layouts/AcademicMarkdownLayout.astro
---
```

Prefer Astro-native Markdown, content, route, and asset behavior over custom pipelines. Keep integration options generic and avoid baking playground-specific document content into package code.
