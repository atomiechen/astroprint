import { visit } from "unist-util-visit";

export type AprintDirectiveDefinition = {
  tag?: string;
  className?: string | string[];
};

export type AprintDirectiveOptions = {
  directives?: Record<string, AprintDirectiveDefinition>;
};

const defaultDirectives: Record<string, AprintDirectiveDefinition> = {
  "cv-meta": { tag: "div", className: "aprint-meta" },
  "two-column-list": { tag: "ul", className: "aprint-list aprint-list--two-column" },
  "system-list": { tag: "ul", className: "aprint-list" },
  publications: { tag: "ul", className: "aprint-publications" },
  entry: { tag: "li", className: "aprint-entry" },
  system: { tag: "li", className: "aprint-entry" },
  heading: { tag: "div", className: "aprint-system-heading" },
  body: { tag: "div", className: "aprint-system-details" },
  col: { tag: "div", className: "aprint-col" },
  highlight: { tag: "span", className: "aprint-highlight" },
  small: { tag: "span", className: "aprint-small" },
};

const ensureNodeData = (node: Record<string, unknown>) => {
  const existingData = node.data;

  if (existingData && typeof existingData === "object" && !Array.isArray(existingData)) {
    return existingData as Record<string, unknown>;
  }

  const data: Record<string, unknown> = {};
  node.data = data;
  return data;
};

const toClassList = (className: string | string[] | unknown) => {
  if (Array.isArray(className)) {
    return className
      .flatMap((value) => (typeof value === "string" ? value.split(/\s+/) : []))
      .filter(Boolean);
  }

  if (typeof className === "string") {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
};

const addClassNames = (node: Record<string, unknown>, className: string | string[]) => {
  const data = ensureNodeData(node);
  const properties = (data.hProperties as Record<string, unknown> | undefined) ?? {};
  const existing = toClassList(properties.className);
  const added = toClassList(className);

  properties.className = [...new Set([...existing, ...added])];
  data.hProperties = properties;
};

const applyDirective = (node: Record<string, unknown>, directive: AprintDirectiveDefinition) => {
  const data = ensureNodeData(node);

  if (directive.tag) {
    data.hName = directive.tag;
  }

  if (directive.className) {
    addClassNames(node, directive.className);
  }
};

export const remarkAprintDirectives = (options: AprintDirectiveOptions = {}) => {
  const directives = {
    ...defaultDirectives,
    ...options.directives,
  };

  return (tree: unknown) => {
    visit(tree as any, (node: any, index, parent) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const directive = directives[node.name] ?? {
          tag: node.type === "textDirective" ? "span" : "div",
          className: `aprint-${node.name}`,
        };
        applyDirective(node, directive);
      }

      if (node.type === "html" && typeof node.value === "string") {
        const value = node.value.trim();
        if (value.startsWith("<!--") && value.endsWith("-->") && parent?.children) {
          parent.children.splice(index, 1);
          return index;
        }
      }
    });
  };
};

export { defaultDirectives };
