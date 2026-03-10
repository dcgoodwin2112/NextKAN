import type { Root, Element, Text } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHART_MARKER_RE = /\[chart:([^\]]+)\]/g;

/**
 * Rehype plugin that converts `[chart:UUID]` text markers into
 * `<div data-chart-id="UUID"></div>` HAST element nodes.
 * Runs after rehypeSanitize so chart placeholders can't be stripped.
 * Invalid UUIDs are silently ignored.
 */
export const rehypeChartPlaceholder: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;
      if (!node.value.includes("[chart:")) return;

      const parts: (Text | Element)[] = [];
      let lastIndex = 0;

      for (const match of node.value.matchAll(CHART_MARKER_RE)) {
        const id = match[1];
        const matchStart = match.index!;

        // Add text before the match
        if (matchStart > lastIndex) {
          parts.push({ type: "text", value: node.value.slice(lastIndex, matchStart) });
        }

        if (UUID_RE.test(id)) {
          // Valid UUID — create chart placeholder element
          parts.push({
            type: "element",
            tagName: "div",
            properties: { dataChartId: id },
            children: [],
          });
        } else {
          // Invalid UUID — keep as plain text
          parts.push({ type: "text", value: match[0] });
        }

        lastIndex = matchStart + match[0].length;
      }

      // No matches replaced — nothing to do
      if (parts.length === 0) return;

      // Add remaining text after last match
      if (lastIndex < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      // Replace the text node with the new nodes
      parent.children.splice(index, 1, ...parts);
    });
  };
};
