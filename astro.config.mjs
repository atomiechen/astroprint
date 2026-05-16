// @ts-check
import { defineConfig } from "astro/config";
import aprint from "./src";

export default defineConfig({
  srcDir: "playground",
  outDir: "site-dist",
  integrations: [
    aprint({
      routes: [
        {
          collection: "cv",
          route: "/cv",
          previewRoute: "/cv-preview",
          defaultId: "main",
        },
      ],
      pdf: {
        route: "/cv",
        outputDir: "public",
        backend: "weasyprint",
      },
      bibtex: {
        highlightedAuthors: ({ frontmatter }) =>
          [frontmatter.name, frontmatter.nameZh].filter(
            (value) => typeof value === "string",
          ),
      },
    }),
  ],
});
