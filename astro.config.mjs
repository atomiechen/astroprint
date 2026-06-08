// @ts-check
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
// This repository's playground imports local source for live development.
// Consumer projects should use: import print from "astroprint";
import print from "./src";
const sourceRoot = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  srcDir: "playground",
  outDir: "site-dist",
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
          route: "/cv",
          previewRoute: "/cv-preview",
          defaultId: "main",
        },
        {
          collection: "cv",
          entry: "main",
          route: "/cv-entry",
          previewRoute: true,
        },
        {
          markdown: "./playground/content/cv/main.md",
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
