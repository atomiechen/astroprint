import { visit } from "unist-util-visit";

const textFromChildren = (children: Array<{ type: string; value?: string }> = []) =>
  children.map((child) => (child.type === "text" ? child.value ?? "" : "")).join("");

const cjkLeadingChar = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

const splitLeadingText = (label: string) => {
  const firstTextIndex = label.search(/\S/u);

  if (firstTextIndex === -1) {
    return { prefix: "", lead: "", tail: label };
  }

  const prefix = label.slice(0, firstTextIndex);
  const text = label.slice(firstTextIndex);
  const firstChar = Array.from(text)[0] ?? "";
  const leadLength = cjkLeadingChar.test(firstChar) ? firstChar.length : text.search(/\s/u);
  const safeLeadLength = leadLength === -1 ? text.length : leadLength;

  return {
    prefix,
    lead: text.slice(0, safeLeadLength),
    tail: label.slice(firstTextIndex + safeLeadLength),
  };
};

const span = (className: string, children: any[]) => ({
  type: "span",
  data: {
    hName: "span",
    hProperties: {
      className: [className],
    },
  },
  children,
});

export const remarkLogoLinkDirectives = () => (tree: any) => {
  visit(tree, "textDirective", (node: any, index, parent: any) => {
    if (node.name !== "logolink" || !parent || typeof index !== "number") return;

    const href = node.attributes?.href;
    const logo = node.attributes?.logo;
    const label = textFromChildren(node.children);

    if (typeof href !== "string" || typeof logo !== "string" || !label) {
      throw new Error('The logolink directive requires href, logo, and label text.');
    }

    const { prefix, lead, tail } = splitLeadingText(label);

    parent.children[index] = {
      type: "link",
      url: href,
      data: {
        hProperties: {
          className: ["logo-link"],
        },
      },
      children: [
        ...(prefix ? [{ type: "text", value: prefix }] : []),
        span("logo-link-leading", [
          {
            type: "image",
            url: logo,
            alt: node.attributes.logoAlt ?? "",
            data: {
              hProperties: {
                className: ["logo-link-logo"],
              },
            },
          },
          { type: "text", value: lead },
        ]),
        ...(tail ? [span("logo-link-tail", [{ type: "text", value: tail }])] : []),
      ],
    };
  });
};
