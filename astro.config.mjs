import { defineConfig } from "astro/config";
import aprint from "./dist/index.js";

export default defineConfig({
  srcDir: "playground",
  outDir: "site-dist",
  integrations: [
    aprint({
      documents: {
        cv: {
          collection: "cv",
          route: "/aprint",
          previewRoute: "/aprint-preview",
          defaultId: "main",
          pdf: {
            output: "CV.pdf",
            backend: "weasyprint",
          },
        },
      },
    }),
  ],
});
