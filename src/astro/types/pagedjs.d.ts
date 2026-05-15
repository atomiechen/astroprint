declare module "pagedjs" {
  export class Previewer {
    preview(
      content?: Node,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: Element,
    ): Promise<{ pages: unknown[] }>;
  }
}
