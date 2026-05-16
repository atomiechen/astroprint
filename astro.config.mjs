import { defineConfig } from "astro/config";
import aprint from "./dist/index.js";

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
    }),
  ],
});
