declare module "@citation-js/core" {
  export class Cite {
    constructor(input: string | unknown, options?: Record<string, unknown>);
    data: unknown[];
    format(format: string, options?: Record<string, unknown>): string;
  }
}
