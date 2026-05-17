export { default } from "./integration.js";
export { formatBibtexPublication, formatBibtexPublications } from "./lib/bib.js";
export { generatePdf } from "./pdf.js";
export { defaultDirectives, remarkAprintDirectives } from "./lib/remark-aprint-directives.js";
export { remarkBibtex } from "./lib/remark-bibtex.js";
export { remarkLogoLinkDirectives } from "./lib/remark-logo-link-directives.js";
export { remarkStripHtmlComments } from "./lib/remark-strip-html-comments.js";
export type {
  FormatPublicationsOptions,
  FormattedPublication,
  PublicationStyle,
} from "./lib/bib.js";
export type { RemarkBibtexOptions } from "./lib/remark-bibtex.js";
export type {
  AprintDirectiveDefinition,
  AprintDirectiveOptions,
} from "./lib/remark-aprint-directives.js";
export type {
  AprintAstroOptions,
  AprintPdfConfig,
  AprintRouteConfig,
} from "./integration.js";
export type {
  GeneratePdfOptions,
  PdfBackend,
} from "./pdf.js";
