// @ts-check
import { defineConfig } from "astro/config";
import print from "./src";

export default defineConfig({
  srcDir: "playground",
  outDir: "site-dist",
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
