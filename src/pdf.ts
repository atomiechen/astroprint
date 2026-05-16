import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";

import { loadAprintManifest } from "./config.js";
import { run, runLocalBin } from "./run.js";

export type PdfBackend = "weasyprint" | "playwright";
export type GeneratePdfOptions = {
  root?: string;
  route?: string;
  backend?: PdfBackend;
  output?: string;
  outputDir?: string;
  port?: number;
  onInfo?: (message: string) => void;
};

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

const serveDist = (distDir: string, port?: number) => {
  const server = createServer((request, response) => {
    const origin = getServerOrigin(server);
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
      server.listen(port ?? 0, "127.0.0.1", () => resolveServer({ server, origin: getServerOrigin(server) }));
    },
  );
};

const getServerOrigin = (server: ReturnType<typeof createServer>) => {
  const address = server.address();
  if (!address || typeof address === "string") {
    return "http://127.0.0.1";
  }
  return `http://127.0.0.1:${address.port}`;
};

const normalizePdfRoute = (route: string) => {
  const [pathname] = route.split(/[?#]/, 1);
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash === "/index" || withLeadingSlash === "/") return "/";
  return extname(withLeadingSlash) ? withLeadingSlash : `${withLeadingSlash.replace(/\/$/, "")}/`;
};

const getRouteHtmlCandidates = (distDir: string, route: string) => {
  const normalizedRoute = normalizePdfRoute(route);
  const withoutTrailingSlash = normalizedRoute.replace(/\/$/, "");

  if (normalizedRoute === "/") {
    return [join(distDir, "index.html")];
  }

  return normalizedRoute.endsWith("/")
    ? [
        join(distDir, normalizedRoute, "index.html"),
        join(distDir, `${withoutTrailingSlash}.html`),
      ]
    : [
        join(distDir, normalizedRoute),
        join(distDir, `${normalizedRoute}.html`),
        join(distDir, normalizedRoute, "index.html"),
      ];
};

const getRouteOutputName = (route: string) => {
  const normalizedRoute = normalizePdfRoute(route);
  if (normalizedRoute === "/") return "index.pdf";

  const routeName = basename(normalizedRoute.replace(/\/$/, ""));
  return `${routeName || "index"}.pdf`;
};

const resolvePathFromRoot = (root: string, path: string) =>
  isAbsolute(path) ? path : resolve(root, path);

const resolveOutputPath = ({
  root,
  route,
  cliOutput,
  cliOutputDir,
  configOutput,
  configOutputDir,
}: {
  root: string;
  route: string;
  cliOutput?: string;
  cliOutputDir?: string;
  configOutput?: string;
  configOutputDir?: string;
}) => {
  const outputName = getRouteOutputName(route);
  const outputDir = cliOutputDir ?? configOutputDir ?? ".";
  const output = cliOutput ?? configOutput ?? outputName;
  return resolve(resolvePathFromRoot(root, outputDir), output);
};

export const generatePdf = async ({
  root = process.cwd(),
  route: routeOption,
  backend,
  output,
  outputDir,
  port,
  onInfo,
}: GeneratePdfOptions = {}) => {
  const distDir = resolve(root, ".aprint");
  let server: ReturnType<typeof createServer> | undefined;

  try {
    await runLocalBin("astro", ["build", "--outDir", distDir], {
      cwd: root,
      env: {
        APRINT_RENDER_HTML: "true",
      },
    });

    const config = await loadAprintManifest(root);
    const pdfConfig = config.pdf;
    const routeSource = routeOption ?? pdfConfig?.route;
    if (!routeSource) {
      throw new Error(
        [
          "No PDF route was provided.",
          "Use `aprint pdf --route /your-page/`, or configure `pdf: { route: \"/your-page/\" }` in the aprint integration.",
        ].join("\n"),
      );
    }
    const route = normalizePdfRoute(routeSource);
    const selectedBackend = backend ?? pdfConfig?.backend ?? "weasyprint";
    const outputPath = resolveOutputPath({
      root,
      route,
      cliOutput: output,
      cliOutputDir: outputDir,
      configOutput: pdfConfig?.output,
      configOutputDir: pdfConfig?.outputDir,
    });

    const htmlPath = getRouteHtmlCandidates(distDir, route).find((candidate) => existsSync(candidate));
    if (!htmlPath) {
      throw new Error(
        [
          `Generated route not found: ${route}`,
          "Make sure the route is an Astro page that builds successfully.",
        ].join("\n"),
      );
    }

    await mkdir(dirname(outputPath), { recursive: true });
    const served = await serveDist(distDir, port);
    server = served.server;
    const url = `${served.origin}${route}`;
    onInfo?.(`PDF source URL: ${url}`);
    onInfo?.(`PDF output path: ${outputPath}`);

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

    return outputPath;
  } finally {
    await new Promise<void>((resolveClose) => server?.close(() => resolveClose()) ?? resolveClose());
  }
};
