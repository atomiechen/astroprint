import { Cite } from "@citation-js/core";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("@citation-js/plugin-bibtex");

type CslName = {
  given?: string;
  family?: string;
  literal?: string;
};

type CslDate = {
  "date-parts"?: number[][];
};

type CitationEntry = {
  id?: string;
  "citation-key"?: string;
  type?: string;
  author?: CslName[];
  title?: string;
  "container-title"?: string;
  issued?: CslDate;
  volume?: string;
  issue?: string;
  page?: string;
  publisher?: string;
  "publisher-place"?: string;
  DOI?: string;
  URL?: string;
  custom?: Record<string, string>;
};

type BiblatexEntry = {
  label: string;
  properties: Record<string, string>;
};

export type FormattedPublication = {
  html: string;
};

export type PublicationStyle = "acm";

export type FormatPublicationsOptions = {
  highlightedAuthors?: string[];
  style?: PublicationStyle;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizePages = (value: string) => value.replaceAll("--", "-").replaceAll("–", "-");

const formatPages = (value: string) => normalizePages(value).replaceAll("-", "–");

const isPresent = (value: string | undefined): value is string => Boolean(value);

const formatUrlLink = (url: string) => {
  const escapedUrl = escapeHtml(url);
  return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a>`;
};

const formatAuthors = (authors: CslName[] = [], highlightedAuthors: string[] = []) => {
  const names = authors.map((author) =>
    author.literal ?? [author.given, author.family].filter(Boolean).join(" "),
  );
  const text = names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;

  return highlightedAuthors
    .filter(Boolean)
    .reduce(
      (html, authorName) =>
        html.replaceAll(escapeHtml(authorName), `<strong>${escapeHtml(authorName)}</strong>`),
      escapeHtml(text),
    );
};

const issuedYear = (entry: CitationEntry) =>
  String(entry.issued?.["date-parts"]?.[0]?.[0] ?? entry.custom?.year ?? "");

const formatAcmArticleDetails = (fields: Record<string, string>, type?: string) => {
  const articleNo = fields.articleno;
  const pages = fields.pages;
  const numPages = fields.numpages;

  if (type === "article-journal") {
    const issueDate = fields.issue_date ? ` (${fields.issue_date})` : "";
    if (articleNo && numPages) return `Article ${articleNo}${issueDate}, ${numPages} pages`;
    if (articleNo) return `Article ${articleNo}`;
  }

  if (articleNo && pages) return `Article ${articleNo}, ${formatPages(pages)}`;
  if (articleNo && numPages) return `Article ${articleNo}, 1–${numPages}`;
  if (pages) return formatPages(pages);
  if (numPages) return `${numPages} pages`;
  return "";
};

const formatAcmPublication = (
  entry: CitationEntry,
  options: Pick<FormatPublicationsOptions, "highlightedAuthors">,
): FormattedPublication => {
  const fields = entry.custom ?? {};
  const authors = formatAuthors(entry.author, options.highlightedAuthors);
  const year = escapeHtml(issuedYear(entry));
  const title = escapeHtml(entry.title ?? fields.title ?? "");
  const venue = escapeHtml(entry["container-title"] ?? fields.booktitle ?? fields.journal ?? "");
  const series = fields.series ? ` (<em>${escapeHtml(fields.series)}</em>)` : "";
  const publisher = fields.publisher ?? entry.publisher ?? "";
  const address = fields.address ?? entry["publisher-place"] ?? "";
  const doi = entry.DOI ?? fields.doi;
  const url = doi ? `https://doi.org/${doi}` : entry.URL ?? fields.url;
  const urlText = url ? ` ${formatUrlLink(url)}` : "";

  if (entry.type === "article-journal") {
    const volumeIssue = [entry.volume, entry.issue].filter(isPresent).map(escapeHtml).join(", ");
    const articleDetails = formatAcmArticleDetails(fields, entry.type);
    const journalParts = [`<em>${venue}</em>`, [volumeIssue, articleDetails].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(" ");

    return {
      html: `${authors}. ${year}. ${title}. ${journalParts}.${urlText}`,
    };
  }

  const details = [publisher, address, formatAcmArticleDetails(fields, entry.type)]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");
  const venueText = venue ? `In <em>${venue}</em>${series}.` : "";
  const detailsText = details ? ` ${details}.` : "";

  return {
    html: `${authors}. ${year}. ${title}. ${venueText}${detailsText}${urlText}`,
  };
};

const attachRawBibtexFields = (entries: CitationEntry[], bibtex: string) => {
  const rawEntries = new Cite(bibtex, {
    target: "@biblatex/entries+list",
  }).data as BiblatexEntry[];
  const rawFieldsByKey = new Map(rawEntries.map((entry) => [entry.label, entry.properties]));

  return entries.map((entry) => {
    const key = entry["citation-key"] ?? entry.id ?? "";
    return {
      ...entry,
      custom: rawFieldsByKey.get(key) ?? {},
    };
  });
};

export const formatBibtexPublications = (
  bibtex: string,
  options: FormatPublicationsOptions = {},
): FormattedPublication[] => {
  const style = options.style ?? "acm";
  const entries = attachRawBibtexFields(new Cite(bibtex).data as CitationEntry[], bibtex);

  if (style === "acm") {
    return entries.map((entry) => formatAcmPublication(entry, options));
  }

  throw new Error(`Unsupported publication style: ${style}`);
};

export const formatBibtexPublication = (
  bibtex: string,
  options: FormatPublicationsOptions = {},
): FormattedPublication => {
  const [publication] = formatBibtexPublications(bibtex, options);

  if (!publication) {
    throw new Error("BibTeX publication entry could not be parsed.");
  }

  return publication;
};
