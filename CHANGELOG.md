# Changelog

All notable changes will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


## 0.1.1 - 2026-06-06

### Added

- The integration now adds `**/.astroprint*/**` to Vite's dev-server watch ignore list automatically, while preserving caller-owned ignore settings.
- `astroprint pdf` now writes `.astroprint/.gitignore` after the temporary Astro build so generated PDF HTML output stays ignored even when the build recreates the directory.


## 0.1.0 - 2026-06-05

### Added

- Initial release of `astroprint`.
- Adds Astro integration support for Markdown directives, `:logolink`, BibTeX conversion, and HTML comment stripping.
- Adds optional collection-backed document routes, Paged.js preview routes, and PDF export through the `astroprint pdf` CLI.
- Includes built-in document, preview, and academic CV layouts plus baseline and academic CV styles.
