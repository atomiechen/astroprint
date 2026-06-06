# Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
