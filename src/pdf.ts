import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";

import {
  getDocumentConfig,
  getDocumentRoute,
  loadAprintConfig,
  type LoadedAprintConfig,
} from "./config.js";
import { run, runLocalBin } from "./run.js";

export type PdfBackend = "weasyprint" | "playwright";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

const serveDist = (distDir: string, port: number) => {
  const origin = `http://127.0.0.1:${port}`;
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", origin);
    const pathname = decodeURIComponent(url.pathname);
    const candidates = pathname.endsWith("/")
      ? [join(distDir, pathname, "index.html")]
      : [join(distDir, pathname), join(distDir, pathname, "index.html")];
    const filePath = candidates.find((candidate) => existsSync(candidate));

    if (!filePath) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });

  return new Promise<{ server: ReturnType<typeof createServer>; origin: string }>(
    (resolveServer, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => resolveServer({ server, origin }));
    },
  );
};

export const generatePdf = async ({
  root = process.cwd(),
  documentName,
  id,
  backend,
  output,
  port = 4330,
}: {
  root?: string;
  documentName?: string;
  id?: string;
  backend?: PdfBackend;
  output?: string;
  port?: number;
} = {}) => {
  const config: LoadedAprintConfig = await loadAprintConfig(root);
  const { document } = getDocumentConfig(config, documentName);
  const distDir = resolve(root, ".aprint");
  const route = getDocumentRoute(document, id);
  const selectedBackend = backend ?? document.pdf?.backend ?? "weasyprint";
  const outputName = output ?? document.pdf?.output ?? `${id ?? document.defaultId ?? "main"}.pdf`;
  const outputPath = resolve(root, "public", outputName);
  let server: ReturnType<typeof createServer> | undefined;

  try {
    await runLocalBin("astro", ["build", "--outDir", distDir], {
      cwd: root,
      env: {
        APRINT_RENDER_HTML: "true",
      },
    });

    const htmlPath = join(distDir, route, "index.html");
    if (!existsSync(htmlPath)) {
      throw new Error(`Generated document route not found: ${route}`);
    }

    await mkdir(join(root, "public"), { recursive: true });
    const served = await serveDist(distDir, port);
    server = served.server;
    const url = `${served.origin}${route}`;

    if (selectedBackend === "weasyprint") {
      const bin = process.env.WEASYPRINT_BIN ?? "weasyprint";
      await run(bin, ["--media-type", "print", url, outputPath], { cwd: root });
    } else {
      const importOptional = new Function("specifier", "return import(specifier)") as (
        specifier: string,
      ) => Promise<any>;
      const { chromium } = await importOptional("playwright").catch(() => {
        throw new Error(
          'The Playwright backend requires "playwright". Install it with your package manager, for example: npm install -D playwright',
        );
      });
      let browser;
      try {
        browser = await chromium.launch({ channel: "chrome" });
      } catch {
        browser = await chromium.launch();
      }
      try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.pdf({
          path: outputPath,
          format: "A4",
          preferCSSPageSize: true,
          printBackground: true,
          outline: true,
          tagged: true,
        });
      } finally {
        await browser.close();
      }
    }
  } finally {
    await new Promise<void>((resolveClose) => server?.close(() => resolveClose()) ?? resolveClose());
  }

  return outputPath;
};
