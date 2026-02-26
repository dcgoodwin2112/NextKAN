export interface TocHeading {
  level: number; // 2 or 3
  text: string;
  id: string;
}

/** Strip inline markdown formatting from heading text. */
function stripInlineMarkdown(text: string): string {
  return (
    text
      // images: ![alt](url) → alt
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      // links: [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // bold/italic: ***text***, **text**, *text*, ___text___, __text__, _text_
      .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, "$2")
      // inline code: `code`
      .replace(/`([^`]+)`/g, "$1")
  );
}

/** Generate a GitHub-style slug ID (matches rehype-slug algorithm). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Extract h2/h3 headings from raw markdown for TOC generation. */
export function extractHeadings(markdown: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const seenIds = new Map<string, number>();
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const rawText = match[2].trim();
    const text = stripInlineMarkdown(rawText);
    let id = slugify(text);

    // Handle duplicate IDs (rehype-slug appends -1, -2, etc.)
    const count = seenIds.get(id) ?? 0;
    if (count > 0) {
      id = `${id}-${count}`;
    }
    seenIds.set(id.replace(/-\d+$/, ""), count + 1);

    headings.push({ level, text, id });
  }

  return headings;
}
