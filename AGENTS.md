# AGENTS.md

## Project Overview

`astroprint` is an Astro integration for Markdown-first documents with normal web preview, Paged.js browser preview, and PDF export.

Calling `astroprint()` with no options should only install the Markdown processing pipeline: directives, the built-in `:logolink` transform, BibTeX conversion, and HTML comment stripping. Do not inject routes unless the user explicitly configures `injectedRoutes`, and do not set a default PDF target unless the user configures top-level `pdf`. `injectedRoutes` is a list, not a keyed object; PDF generation is configured separately through top-level `pdf`.

The integration should update Vite config so `vite.server.watch.ignored` includes `**/.astroprint*/**`. Preserve caller-owned watcher ignores via Astro/Vite config merging, and do not re-add the exact pattern when it is already configured.

Route injection should be decided before calling `injectRoute`, not inside generated route `getStaticPaths()`. Generated routes should assume they are meant to render once injected. In `astro dev`, always inject configured normal routes. In PDF render builds, `ASTROPRINT_RENDER_HTML=true` must force normal route injection regardless of route flags so `astroprint pdf` can reach configured routes. In normal `astro build`, each route's `injectDuringBuild` flag controls normal route injection; it defaults to `true`. Preview routes are opt-in only: omit `previewRoute` or set `previewRoute: false` to skip preview route injection, set `previewRoute: true` to use the default `${route}-preview` path (`/preview` for `/`), or pass a custom preview route string.

Injected route configs must include an explicit `route`; astroprint should not guess a public URL. Supported sources are `markdown` for a single Markdown file, `collection` plus `entry` for one content collection item, and `collection` plus optional `defaultId` for a multi-document collection route. Keep these source shapes mutually exclusive in TypeScript. PDF output paths are resolved as normal filesystem paths: `outputDir` is the base directory and `output` is resolved inside it, with absolute `output` paths used as-is. When the CLI omits `--port`, the temporary server should bind to an OS-assigned free port.

`astroprint pdf` builds temporary HTML into `.astroprint/`. After the Astro build, write `.astroprint/.gitignore` with `*` because the build may recreate the output directory; do not unignore that file from inside itself. Validation directories such as `.astroprint-check/` remain maintainer-managed.

The package code lives in `src/`. Built-in Astro surfaces live directly under top-level source folders:

- `src/components/Document.astro` is the theme-neutral default document root. It should not render title markup or assume frontmatter fields.
- `src/components/AcademicDocument.astro` is the built-in academic document surface. It imports the academic CV theme, renders academic title markup, and wraps slotted content in `Document.astro`.
- `src/components/PreviewShell.astro` is the theme-neutral generated-route shell with navigation, print button, preview status, scroll restoration, and normal/Paged.js preview branching.
- `src/layouts/BaseLayout.astro` is the minimal HTML shell with `<html>`, `<head>`, viewport metadata, optional `pageTitle`, and global page/body baseline.
- `src/layouts/AcademicLayout.astro` is the built-in academic layout. It maps frontmatter/entry fields and switches between plain `AcademicDocument.astro` and `PreviewShell.astro + AcademicDocument.astro` with its `withPreviewShell` prop.
- `src/components/PrintPreview.astro` is the document-agnostic Paged.js preview wrapper.
- `src/styles/base.css` defines the required baseline page, typography, and preview CSS variables plus neutral document root styles.
- `src/styles/academic-cv.css` is the built-in academic CV document theme.
- `src/vendor/pagedjs-0.4.3.esm.min.js` is the vendored minified Paged.js ESM bundle used by `PrintPreview.astro`.

The playground content lives under `playground/` and is useful for local validation.

## Markdown Directives

`remark-directive` is installed by the integration. `remarkAstroPrintDirectives` should keep directives generic: known list aliases map to semantic tags (`ul`, `ol`, `li`, `entry`), unknown text directives default to `span`, and unknown leaf/container directives default to `div`. All directives get a default `astroprint-{name}` class unless the caller overrides that directive with `directives`.

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

- Install dependencies: `pnpm install --frozen-lockfile`
- Type-check package and playground: `pnpm check`
- Build package output: `pnpm build`
- Run the Astro playground dev server: `pnpm dev`
- Refresh the vendored Paged.js bundle: `pnpm vendor:pagedjs`
- Generate a configured PDF through the CLI: `pnpm astroprint pdf`
- Generate a manual page-route PDF through the CLI: `pnpm astroprint pdf -- --route /`

For validating injected document routes in a static build, run:

```bash
ASTROPRINT_RENDER_HTML=true pnpm exec astro build --outDir .astroprint-check
```

Remove generated validation output afterward. Do not edit `.astro/`, `.astroprint/`, `.astroprint-check/`, `dist/`, `site-dist/`, or `public/` as source files.

`pnpm vendor:pagedjs` downloads `pagedjs@0.4.3/dist/paged.esm.js` from unpkg and minifies it to `src/vendor/pagedjs-0.4.3.esm.min.js` with esbuild. Keep the version in the filename, the fetch URL, and `PrintPreview.astro`'s URL import in sync when upgrading Paged.js. The minified bundle keeps upstream legal comments; do not replace it with `paged.min.js` because that file is not the ESM named-export bundle loaded by `PrintPreview.astro`.

## Print Preview

`PrintPreview.astro` is preview-only. Callers should render it only when they want Paged.js preview mode and render their document directly otherwise.

It wraps slotted document content, feeds selected page styles to Paged.js, and requires an explicit `documentSelector` prop. Callers may also pass `styleSelector`, `statusSelector`, and `readyEvent`. `styleSelector` defaults to `style` and should be narrowed when callers need to exclude preview chrome styles.

`PrintPreview.astro` imports the vendored Paged.js ESM bundle from `src/vendor/` as a URL asset, then dynamically imports that URL at runtime. This keeps the component usable without requiring consuming projects to install `pagedjs` or configure Vite `optimizeDeps`, while avoiding a large preview-runtime chunk warning during production builds.

After Paged.js finishes paginating, `PrintPreview.astro` inserts a browser-print `@page` style with concrete page size and margin values resolved from the source document. Paged.js injects `@page { margin: 0 }` rules for its screen preview, so the astroprint print rule must be inserted after pagination. Keep this in sync with the Paged.js preview stylesheet so browser printing from preview routes matches normal document printing.

The component script initializes all `.print-preview-source` instances because Astro may emit the component script once per page even when the component appears multiple times.

Callers must define page variables on the document or `:root`:

- `--astroprint-page-width`
- `--astroprint-page-height`
- `--astroprint-page-margin-top`
- `--astroprint-page-margin-x`
- `--astroprint-page-margin-bottom`

`--astroprint-print-preview-top-offset` is optional.

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
- `Document.astro` should own only the theme-neutral document root and may import `base.css`; do not import theme CSS from it. AstroPrint-owned root elements should use the `astroprint-scope` class so `base.css` can apply scoped reset styles without touching host-page chrome.
- `BaseLayout.astro` should own only the HTML shell, optional `pageTitle`, and global page/body baseline.
- `AcademicDocument.astro` should own the built-in academic title markup and academic theme import.
- `PreviewShell.astro` should own only the theme-neutral navigation, print button, preview status, preview branching, scroll restoration, and caller-owned preview chrome styles.
- `AcademicLayout.astro` should own frontmatter/entry mapping and compose `AcademicDocument.astro` with `PreviewShell.astro` when generated routes pass `withPreviewShell={true}` or standalone Markdown frontmatter sets `withPreviewShell: true`. It should read document titles from `entry.data` or `frontmatter`, not separate root-level title props.
- `PrintPreview.astro` should remain document-agnostic and should not depend on `.astroprint-document` beyond what callers pass through `documentSelector`. Layouts that render their own document root without `Document.astro` should import `base.css` or define equivalent page variables and `@page` rules.

Standalone Markdown pages can opt into the built-in academic document surface with:

```md
---
layout: astroprint/layouts/AcademicLayout.astro
title: CV Notes
secondaryTitle: Draft
withPreviewShell: true
---
```

Prefer Astro-native Markdown, content, route, and asset behavior over custom pipelines. Keep integration options generic and avoid baking playground-specific document content into package code.
