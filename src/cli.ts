#!/usr/bin/env node
import { Command } from "commander";

import { generatePdf, type PdfBackend } from "./pdf.js";
import { runLocalBin } from "./run.js";

const program = new Command();
const pdfBackends = new Set<PdfBackend>(["weasyprint", "playwright"]);

const parseBackend = (backend: string | undefined) => {
  if (!backend) return undefined;
  if (pdfBackends.has(backend as PdfBackend)) return backend as PdfBackend;
  throw new Error(`Invalid PDF backend: ${backend}. Expected "weasyprint" or "playwright".`);
};

const parsePort = (port: string | undefined) => {
  if (port === undefined) return undefined;
  const value = Number(port);
  if (Number.isInteger(value) && value > 0 && value <= 65535) return value;
  throw new Error(`Invalid port: ${port}. Expected an integer from 1 to 65535.`);
};

program
  .name("astroprint")
  .description("Astro-powered Markdown documents with paged preview and PDF export.")
  .version("0.1.0");

program
  .command("dev")
  .description("Start Astro dev server.")
  .allowUnknownOption(true)
  .argument("[args...]", "Arguments passed to astro dev")
  .action(async (args: string[]) => {
    await runLocalBin("astro", ["dev", ...args]);
  });

program
  .command("build")
  .description("Run Astro production build.")
  .allowUnknownOption(true)
  .argument("[args...]", "Arguments passed to astro build")
  .action(async (args: string[]) => {
    await runLocalBin("astro", ["build", ...args]);
  });

program
  .command("pdf")
  .description("Generate a PDF from a configured or explicit Astro route.")
  .argument("[document]", "Document path appended to the configured or explicit route")
  .option("-r, --route <route>", "Astro route to print, such as / or /cv-notes/")
  .option("-b, --backend <backend>", "PDF backend: weasyprint or playwright")
  .option("-o, --output <file>", "Output PDF path")
  .option("--output-dir <dir>", "Directory for the generated PDF; filename is derived from the route")
  .option("-p, --port <port>", "Temporary static server port")
  .action(async (document: string | undefined, options) => {
    const outputPath = await generatePdf({
      route: options.route,
      document,
      backend: parseBackend(options.backend),
      output: options.output,
      outputDir: options.outputDir,
      port: parsePort(options.port),
      onInfo: (message) => console.error(message),
    });
    console.log(`Generated: ${outputPath}`);
  });

await program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
