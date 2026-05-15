export { default } from "./astro/index.js";
export {
  defaultDocuments,
  getDocumentConfig,
  getDocumentRoute,
  loadAprintConfig,
  type LoadedAprintConfig,
} from "./config.js";
export { generatePdf } from "./pdf.js";
export { defaultDirectives, remarkAprintDirectives } from "./lib/remark-aprint-directives.js";
export type {
  AprintDirectiveDefinition,
  AprintDirectiveOptions,
} from "./lib/remark-aprint-directives.js";
export type {
  AprintAstroOptions,
  AprintDocumentConfig,
} from "./astro/index.js";
export type {
  PdfBackend,
} from "./pdf.js";
