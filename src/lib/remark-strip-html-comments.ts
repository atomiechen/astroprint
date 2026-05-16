import { visit } from "unist-util-visit";

export const remarkStripHtmlComments = () => (tree: unknown) => {
  visit(tree as any, "html", (node: any, index, parent: any) => {
    if (typeof index !== "number" || !parent?.children || typeof node.value !== "string") {
      return;
    }

    const value = node.value.trim();
    if (value.startsWith("<!--") && value.endsWith("-->")) {
      parent.children.splice(index, 1);
      return index;
    }
  });
};
