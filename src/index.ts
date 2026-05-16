export { default } from "./astro/index.js";
export { generatePdf } from "./pdf.js";
export { defaultDirectives, remarkAprintDirectives } from "./lib/remark-aprint-directives.js";
export { remarkLogoLinkDirectives } from "./lib/remark-logo-link-directives.js";
export { remarkStripHtmlComments } from "./lib/remark-strip-html-comments.js";
export type {
  AprintDirectiveDefinition,
  AprintDirectiveOptions,
} from "./lib/remark-aprint-directives.js";
export type {
  AprintAstroOptions,
  AprintPdfConfig,
  AprintRouteConfig,
} from "./astro/index.js";
export type {
  GeneratePdfOptions,
  PdfBackend,
} from "./pdf.js";
