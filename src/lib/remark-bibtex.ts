import { visit } from "unist-util-visit";

import { formatBibtexPublication, type FormatPublicationsOptions } from "./bib.js";

export type BibtexContext = {
  frontmatter: Record<string, unknown>;
  meta?: string;
  node: unknown;
};

export type HighlightedAuthors =
  | string
  | string[]
  | ((context: BibtexContext) => string | string[] | undefined);

export type RemarkBibtexOptions = Omit<FormatPublicationsOptions, "highlightedAuthors"> & {
  highlightedAuthors?: HighlightedAuthors;
};

const valueFromMeta = (meta: string | undefined, key: string) =>
  meta?.match(new RegExp(`(?:^|\\s)${key}=(?:"([^"]+)"|'([^']+)'|([^\\s]+))`))?.slice(1).find(Boolean);

const toAuthorList = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );

const authorsFromMeta = (meta: string | undefined) => {
  const value = valueFromMeta(meta, "highlightedAuthors") ?? valueFromMeta(meta, "highlight");
  return value?.split(",").map((author) => author.trim());
};

const resolveHighlightedAuthors = (
  value: HighlightedAuthors | undefined,
  context: BibtexContext,
) => {
  if (typeof value === "function") {
    return toAuthorList(value(context));
  }

  return toAuthorList(value);
};

export const remarkBibtex = (options: RemarkBibtexOptions = {}) => (tree: unknown, file?: any) => {
  const frontmatter = (file?.data?.astro?.frontmatter ?? {}) as Record<string, unknown>;

  visit(tree as any, "code", (node: any) => {
    if (node.lang !== "bibtex") return;

    const meta = typeof node.meta === "string" ? node.meta : undefined;
    const style = (valueFromMeta(meta, "style") ?? options.style)?.toLowerCase();
    if (!style) return;
    const lang = valueFromMeta(meta, "lang") ?? options.lang;
    const context = { frontmatter, meta, node } satisfies BibtexContext;
    const highlightedAuthors = authorsFromMeta(meta) ?? resolveHighlightedAuthors(options.highlightedAuthors, context);

    const formatted = formatBibtexPublication(String(node.value ?? ""), {
      ...options,
      highlightedAuthors,
      lang,
      style: style as FormatPublicationsOptions["style"],
    });

    node.type = "html";
    node.value = `<p class="astroprint-bibtex">${formatted.html}</p>`;
    delete node.lang;
    delete node.meta;
    delete node.children;
  });
};
