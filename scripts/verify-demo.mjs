import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const outputDir = new URL("../site-dist/", import.meta.url);
const expectedPages = [
  "index.html",
  "cv-native/index.html",
  "cv/index.html",
  "cv-preview/index.html",
  "cv/selected/index.html",
  "cv-preview/selected/index.html",
  "cv-entry/index.html",
  "cv-entry-preview/index.html",
  "cv-markdown/index.html",
  "cv-markdown-preview/index.html",
];
const base = (process.env.ASTROPRINT_DEMO_BASE || "/astroprint").replace(/\/$/, "");
const sourceRoot = "https://github.com/atomiechen/astroprint/blob/main/";

const readPage = async (path) => {
  const file = new URL(path, outputDir);
  const fileStat = await stat(file);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`Demo output is empty: ${path}`);
  }
  return readFile(file, "utf-8");
};

const linksIn = (html) =>
  [...html.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => ({
    href: attributes.match(/\bhref="([^"]*)"/)?.[1],
    target: attributes.match(/\btarget="([^"]*)"/)?.[1],
    rel: attributes.match(/\brel="([^"]*)"/)?.[1]?.split(/\s+/) ?? [],
  }));

const assertNewTabLink = (links, href, context) => {
  const link = links.find((candidate) => candidate.href === href);
  if (
    !link ||
    link.target !== "_blank" ||
    !link.rel.includes("noopener") ||
    !link.rel.includes("noreferrer")
  ) {
    throw new Error(`Link must open safely in a new tab (${context}): ${href}`);
  }
};

const pages = new Map(
  await Promise.all(expectedPages.map(async (path) => [path, await readPage(path)])),
);

const home = pages.get("index.html");
const homeLinks = linksIn(home);
for (const href of [
  `${base}/cv-native/`,
  `${base}/cv-markdown/`,
  `${base}/cv-markdown-preview/`,
  `${base}/cv-entry/`,
  `${base}/cv-entry-preview/`,
  `${base}/cv/`,
  `${base}/cv-preview/`,
  `${base}/cv/selected/`,
  `${base}/cv-preview/selected/`,
]) {
  if (!home.includes(`href=${JSON.stringify(href)}`)) {
    throw new Error(`Demo home is missing link: ${href}`);
  }
  assertNewTabLink(homeLinks, href, "demo example");
}

for (const sourceHref of [
  `${sourceRoot}playground/pages/index.astro`,
  `${sourceRoot}playground/pages/cv-native.md`,
  `${sourceRoot}playground/content/cv/main.md`,
  `${sourceRoot}playground/content.config.ts`,
  `${sourceRoot}astro.config.mjs`,
  `${sourceRoot}playground/content/cv/selected.md`,
  `${sourceRoot}playground/layouts/ModernDocumentLayout.astro`,
  `${sourceRoot}playground/styles/modern-document.css`,
  `${sourceRoot}playground/layouts/EditorialDocumentLayout.astro`,
  `${sourceRoot}playground/styles/editorial-document.css`,
]) {
  if (!home.includes(`href=${JSON.stringify(sourceHref)}`)) {
    throw new Error(`Demo home is missing source link: ${sourceHref}`);
  }
}

for (const [path, html] of pages) {
  for (const link of linksIn(html).filter((candidate) => candidate.href?.startsWith("http"))) {
    assertNewTabLink([link], link.href, path);
  }
}

const pageSourceLinks = {
  "cv-native/index.html": [
    `${sourceRoot}playground/pages/cv-native.md`,
    `${sourceRoot}src/layouts/AcademicLayout.astro`,
    `${sourceRoot}src/styles/academic-cv.css`,
  ],
  "cv-markdown/index.html": [
    `${sourceRoot}playground/content/cv/main.md`,
    `${sourceRoot}astro.config.mjs`,
    `${sourceRoot}playground/layouts/ModernDocumentLayout.astro`,
    `${sourceRoot}playground/styles/modern-document.css`,
  ],
  "cv/index.html": [
    `${sourceRoot}playground/content/cv/main.md`,
    `${sourceRoot}playground/content.config.ts`,
    `${sourceRoot}astro.config.mjs`,
    `${sourceRoot}playground/layouts/EditorialDocumentLayout.astro`,
    `${sourceRoot}playground/styles/editorial-document.css`,
  ],
  "cv/selected/index.html": [
    `${sourceRoot}playground/content/cv/selected.md`,
    `${sourceRoot}playground/content.config.ts`,
    `${sourceRoot}astro.config.mjs`,
    `${sourceRoot}playground/layouts/EditorialDocumentLayout.astro`,
    `${sourceRoot}playground/styles/editorial-document.css`,
  ],
};
for (const [path, expectedLinks] of Object.entries(pageSourceLinks)) {
  const html = pages.get(path);
  for (const href of expectedLinks) {
    if (!html.includes(`href=${JSON.stringify(href)}`)) {
      throw new Error(`Example page is missing its source link (${path}): ${href}`);
    }
  }
}

if (!home.includes("Created by") || !home.includes("Atomie CHEN")) {
  throw new Error("Creator credit is missing from the demo home");
}

const nativePage = pages.get("cv-native/index.html");
if (!nativePage.includes(`href="${base}"`) || !nativePage.includes("data-print-button")) {
  throw new Error("Native Markdown page is missing its preview-shell navigation");
}
if (nativePage.includes("print-preview-root")) {
  throw new Error("withPreviewShell must not be presented as a Paged.js preview");
}
if (!nativePage.includes("Astro Markdown page with the default academic theme")) {
  throw new Error("Native Markdown example does not identify its authoring path and theme");
}

for (const path of ["cv-markdown/index.html", "cv-markdown-preview/index.html"]) {
  const html = pages.get(path);
  if (!html.includes("Generated routes from one Markdown file") || !html.includes("modern theme")) {
    throw new Error(`Generated Markdown example is not self-describing: ${path}`);
  }
}

const mainDocumentPages = [
  "cv-native/index.html",
  "cv/index.html",
  "cv-preview/index.html",
  "cv-entry/index.html",
  "cv-entry-preview/index.html",
  "cv-markdown/index.html",
  "cv-markdown-preview/index.html",
];
for (const path of mainDocumentPages) {
  const html = pages.get(path);
  for (const expected of [
    "B.Eng. in Computer Science and Technology, Xinya College",
    "Investigating Context-Aware Collaborative Text Entry on Smartphones using Large Language Models",
    "From Gap to Synergy: Enhancing Contextual Understanding through Human-Machine Collaboration in Personalized Systems",
  ]) {
    if (!html.includes(expected)) {
      throw new Error(`Main CV example is missing expected content (${path}): ${expected}`);
    }
  }
  if (html.includes("Current Position") || html.includes("Research Profile")) {
    throw new Error(`Main CV example contains an intentionally omitted section: ${path}`);
  }
  if (html.includes("chen-wh@tsinghua.edu.cn") || html.includes("mailto:")) {
    throw new Error(`Demo page exposes an email address: ${path}`);
  }
  if (html.indexOf("github.com/atomiechen") > html.indexOf("About this page")) {
    throw new Error(`Page explanation must follow contact information: ${path}`);
  }
  if (/Example [123]/.test(html)) {
    throw new Error(`Page explanation must not depend on demo ordering: ${path}`);
  }
}

for (const path of [
  "cv/index.html",
  "cv-preview/index.html",
  "cv/selected/index.html",
  "cv-preview/selected/index.html",
  "cv-entry/index.html",
  "cv-entry-preview/index.html",
]) {
  const html = pages.get(path);
  if (
    !html.includes("Generated routes from an Astro content collection") ||
    !html.includes("editorial theme")
  ) {
    throw new Error(`Content collection example is not self-describing: ${path}`);
  }
}

const normalPages = [
  "cv-native/index.html",
  "cv/index.html",
  "cv/selected/index.html",
  "cv-entry/index.html",
  "cv-markdown/index.html",
];
for (const path of normalPages) {
  const html = pages.get(path);
  if (!html.includes(`href="${base}"`)) {
    throw new Error(`Home navigation does not respect the demo base: ${path}`);
  }
  if (!html.includes("Weihao Chen")) {
    throw new Error(`Sample CV content is missing: ${path}`);
  }
}

const previewPages = [
  "cv-preview/index.html",
  "cv-preview/selected/index.html",
  "cv-entry-preview/index.html",
  "cv-markdown-preview/index.html",
];
for (const path of previewPages) {
  const html = pages.get(path);
  if (!html.includes(`href="${base}/`)) {
    throw new Error(`Preview navigation does not respect the demo base: ${path}`);
  }
  if (!html.includes("print-preview-root")) {
    throw new Error(`Paged preview surface is missing: ${path}`);
  }
}

console.log(`Verified ${expectedPages.length} public demo pages in ${join("site-dist")}.`);
