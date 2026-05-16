# AGENTS.md

## Project Overview

`aprint` is an Astro integration for Markdown-first documents with normal web preview, Paged.js browser preview, and PDF export.

Calling `aprint()` with no options should only install the Markdown directive pipeline. Do not inject collection routes unless the user explicitly configures `routes`, and do not set a default PDF target unless the user configures top-level `pdf`. `routes` is a list, not a keyed object; PDF generation is configured separately through top-level `pdf`.

When a route config omits `route`, the default route is `/aprint/{collection}`. PDF output paths are resolved as normal filesystem paths: `outputDir` is the base directory and `output` is resolved inside it, with absolute `output` paths used as-is. When the CLI omits `--port`, the temporary server should bind to an OS-assigned free port.

The package code lives in `src/`. Built-in Astro surfaces live under `src/astro/`:

- `src/astro/layouts/DocumentLayout.astro` is the default document shell.
- `src/astro/components/Document.astro` is the default document root and imports the academic CV theme.
- `src/astro/layouts/DocumentMarkdownLayout.astro` is the lightweight layout for standalone Markdown pages that want the default document surface.
- `src/astro/components/PrintPreview.astro` is the document-agnostic Paged.js preview wrapper.
- `src/astro/styles/academic-cv.css` is the built-in academic CV document theme.

The playground content lives under `playground/` and is useful for local validation.

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

- `academic-cv.css` should style document content and paged-media behavior.
- `Document.astro` should own the built-in document root and title markup.
- `DocumentLayout.astro` should own only the built-in navigation, print button, preview status, preview branching, and caller-owned preview chrome styles.
- `DocumentMarkdownLayout.astro` should stay a lightweight Markdown-page path: it wraps content in `Document.astro` and does not add generated routes, navigation, preview, or PDF behavior.
- `PrintPreview.astro` should remain document-agnostic and should not depend on `.aprint-document` beyond what callers pass through `documentSelector`.

Standalone Markdown pages can opt into the default document surface with:

```md
---
layout: aprint/layouts/DocumentMarkdownLayout.astro
---
```

Prefer Astro-native Markdown, content, route, and asset behavior over custom pipelines. Keep integration options generic and avoid baking playground-specific document content into package code.
