// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import rehypeExternalLinks from "rehype-external-links";
// This repository's playground imports local source for live development.
// Consumer projects should use: import print from "astroprint";
import print from "./src";

const demoBase = process.env.ASTROPRINT_DEMO_BASE || undefined;
const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  site: "https://atomiechen.github.io",
  base: demoBase,
  srcDir: "playground",
  outDir: "site-dist",
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
  },
  vite: {
    resolve: {
      alias: {
        astroprint: sourceRoot,
      },
    },
  },
  integrations: [
    print({
      injectedRoutes: [
        {
          collection: "cv",
          layout: "./playground/layouts/EditorialDocumentLayout.astro",
          route: "/cv",
          previewRoute: "/cv-preview",
          defaultId: "main",
        },
        {
          collection: "cv",
          entry: "main",
          layout: "./playground/layouts/EditorialDocumentLayout.astro",
          route: "/cv-entry",
          previewRoute: true,
        },
        {
          markdown: "./playground/content/cv/main.md",
          layout: "./playground/layouts/ModernDocumentLayout.astro",
          route: "/cv-markdown",
          previewRoute: true,
        },
      ],
      pdf: {
        route: "/cv",
        outputDir: "public",
        backend: "weasyprint",
      },
      bibtex: {
        highlightedAuthors: ({ frontmatter }) =>
          [frontmatter.title, frontmatter.secondaryTitle].filter(
            (value) => typeof value === "string",
          ),
      },
    }),
  ],
});
