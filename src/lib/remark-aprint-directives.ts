import { visit } from "unist-util-visit";

export type AprintDirectiveDefinition = {
  tag?: string;
  className?: string | string[];
};

export type AprintDirectiveOptions = {
  directives?: Record<string, AprintDirectiveDefinition>;
};

const defaultDirectives: Record<string, AprintDirectiveDefinition> = {
  ul: { tag: "ul" },
  "unordered-list": { tag: "ul" },
  ol: { tag: "ol" },
  "ordered-list": { tag: "ol" },
  li: { tag: "li" },
  "list-item": { tag: "li" },
  entry: { tag: "li" },
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

const applyAttributes = (node: Record<string, unknown>) => {
  const attributes = node.attributes;

  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return;
  }

  const data = ensureNodeData(node);
  const properties = (data.hProperties as Record<string, unknown> | undefined) ?? {};
  const classes = [
    ...toClassList(properties.className),
    ...toClassList((attributes as Record<string, unknown>).class),
    ...toClassList((attributes as Record<string, unknown>).className),
  ];

  for (const [key, value] of Object.entries(attributes as Record<string, unknown>)) {
    if (key === "class" || key === "className" || value === null || value === undefined) {
      continue;
    }

    properties[key] = value;
  }

  if (classes.length > 0) {
    properties.className = [...new Set(classes)];
  }

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
    visit(tree as any, (node: any) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        const userDirective = directives[node.name] ?? {};
        // set default tag if not specified by user
        const {
          tag = node.type === "textDirective" ? "span" : "div",
          className = `aprint-${node.name}`,
        } = userDirective;
        const directive = { tag, className } satisfies AprintDirectiveDefinition;
        applyAttributes(node);
        applyDirective(node, directive);
      }
    });
  };
};

export { defaultDirectives };
