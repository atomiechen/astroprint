declare module "@citation-js/core" {
  export class Cite {
    constructor(input: string | unknown, options?: Record<string, unknown>);
    data: unknown[];
    format(format: string, options?: Record<string, unknown>): string;
  }

  type PluginConfigRegistry = {
    add(ref: string, config: unknown): void;
    get(ref: string): any;
    has(ref: string): boolean;
    list(): string[];
    remove(ref: string): void;
  };

  export const plugins: {
    add(ref: string, plugins?: Record<string, unknown>): void;
    remove(ref: string): void;
    has(ref: string): boolean;
    list(): string[];
    config: PluginConfigRegistry;
  };
}
