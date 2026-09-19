# Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-09-19

### Added

- Added a small embedded default favicon to the built-in base layout; custom layouts can replace it or pass `faviconHref={false}`.
- Added two small custom-theme examples and an introductory customization recipe showing how to reuse the academic layout with project CSS.
- Added a credited, self-contained online demo that explains three progressive authoring paths, from an Astro-native Markdown page through generated Markdown and content-collection routes, with web, Paged.js, and source links.
- Added a native `src/pages`-style Markdown example that selects the academic layout and preview shell entirely through frontmatter.
- Added a selected-work CV variant demonstrating multi-document collection routes.

### Fixed

- Paged.js previews now avoid duplicate document IDs while retaining source IDs for browser printing and failed-preview fallback.
- Paged.js preview navigation now uses the singular label for a one-page document.
- Built-in CSS variable defaults now use low-specificity selectors so project-level `:root` overrides remain stable regardless of stylesheet load order.
- Generated route navigation now respects Astro's `base` config for normal and Paged.js preview links.
- `PreviewShell.astro` now defaults its Home link to Astro's `BASE_URL`, so package-owned navigation stays inside subpath deployments.
- Demo links now use Astro's `BASE_URL`, so they work whether the demo home URL includes a trailing slash or not.
- Demo examples, source links, and external Markdown links now open safely in new tabs.
- The academic theme now sizes inline code relative to surrounding text and slightly tightens its word spacing instead of relying on the visually larger, wider-spaced browser monospace default.

## [0.2.0] - 2026-06-07

### Added

- Added `AcademicDocument.astro` for reusing the built-in academic CV document surface inside caller-owned layouts.
- Added `PreviewShell.astro` for reusing generated-route navigation, print behavior, scroll restoration, and Paged.js preview branching without astroprint's `BaseLayout.astro`.
- Added injected route support for single Markdown files and single content collection entries.
- Added source-specific injected route config types: `AstroPrintCollectionRouteConfig`, `AstroPrintCollectionEntryRouteConfig`, `AstroPrintMarkdownRouteConfig`, and `AstroPrintInjectedRouteConfig`.

### Changed

- Renamed the integration route injection option from `routes` to `injectedRoutes`.
- Replaced the exported `AstroPrintRouteConfig` type with `AstroPrintInjectedRouteConfig`.
- Injected route configs now require an explicit `route`; astroprint no longer injects a default `/astroprint/{collection}` route.
- Paged preview routes are now opt-in. Omit `previewRoute` or set it to `false` to skip preview injection, set `previewRoute: true` for the default preview path, or pass a custom preview route string.
- Generated routes now pass `withPreviewShell={true}` to layouts instead of `preview={true}`.
- `AcademicLayout.astro` now composes `AcademicDocument.astro`, reads titles only from collection entry data or Markdown frontmatter, and supports `withPreviewShell` from standalone Markdown frontmatter.
- `PrintPreview.astro` now defaults its ready event to `astroprint-preview:ready`.
- Renamed the playground package script from `pnpm pdf` to `pnpm astroprint` for running the local CLI.

### Removed

- Removed `PreviewLayout.astro`; use `PreviewShell.astro` inside a layout instead.
- Removed root-level `title` and `secondaryTitle` props from `AcademicLayout.astro`; use collection entry data or Markdown frontmatter instead.


## [0.1.1] - 2026-06-06

### Added

- The integration now adds `**/.astroprint*/**` to Vite's dev-server watch ignore list automatically, while preserving caller-owned ignore settings.
- `astroprint pdf` now writes `.astroprint/.gitignore` after the temporary Astro build so generated PDF HTML output stays ignored even when the build recreates the directory.


## [0.1.0] - 2026-06-05

### Added

- Initial release of `astroprint`.
- Adds Astro integration support for Markdown directives, `:logolink`, BibTeX conversion, and HTML comment stripping.
- Adds optional collection-backed document routes, Paged.js preview routes, and PDF export through the `astroprint pdf` CLI.
- Includes built-in document, preview, and academic CV layouts plus baseline and academic CV styles.
