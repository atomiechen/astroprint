#!/usr/bin/env node
import { Command } from "commander";

import { generatePdf, type PdfBackend } from "./pdf.js";
import { runLocalBin } from "./run.js";

const program = new Command();

program
  .name("aprint")
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
  .description("Generate a PDF from an injected aprint Astro route.")
  .argument("[document]", "Document config key, such as cv", "cv")
  .argument("[id]", "Document id inside the collection, such as main")
  .option("-b, --backend <backend>", "PDF backend: weasyprint or playwright")
  .option("-o, --output <file>", "Output PDF filename under public/")
  .option("-p, --port <port>", "Temporary static server port", "4330")
  .action(async (documentName, id, options) => {
    const outputPath = await generatePdf({
      documentName,
      id,
      backend: options.backend as PdfBackend | undefined,
      output: options.output,
      port: Number(options.port),
    });
    console.log(`Generated: ${outputPath}`);
  });

await program.parseAsync();
