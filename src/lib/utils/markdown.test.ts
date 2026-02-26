import { describe, it, expect } from "vitest";
import { extractHeadings } from "./markdown";

describe("extractHeadings", () => {
  it("extracts h2 and h3 headings", () => {
    const md = `# Title
## Getting Started
Some text
### Installation
More text
## Usage
### Configuration
`;
    const headings = extractHeadings(md);
    expect(headings).toEqual([
      { level: 2, text: "Getting Started", id: "getting-started" },
      { level: 3, text: "Installation", id: "installation" },
      { level: 2, text: "Usage", id: "usage" },
      { level: 3, text: "Configuration", id: "configuration" },
    ]);
  });

  it("skips h1 and h4+ headings", () => {
    const md = `# H1
## H2
### H3
#### H4
##### H5
`;
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0]).toEqual({ level: 2, text: "H2", id: "h2" });
    expect(headings[1]).toEqual({ level: 3, text: "H3", id: "h3" });
  });

  it("handles duplicate heading IDs", () => {
    const md = `## Overview
## Overview
## Overview
`;
    const headings = extractHeadings(md);
    expect(headings).toEqual([
      { level: 2, text: "Overview", id: "overview" },
      { level: 2, text: "Overview", id: "overview-1" },
      { level: 2, text: "Overview", id: "overview-2" },
    ]);
  });

  it("strips inline formatting from heading text", () => {
    const md = `## **Bold** heading
## *Italic* heading
## \`code\` heading
## [Link text](https://example.com) heading
## ![alt](image.png) heading
`;
    const headings = extractHeadings(md);
    expect(headings[0].text).toBe("Bold heading");
    expect(headings[1].text).toBe("Italic heading");
    expect(headings[2].text).toBe("code heading");
    expect(headings[3].text).toBe("Link text heading");
    expect(headings[4].text).toBe("alt heading");
  });

  it("returns empty array for content without headings", () => {
    const md = `Just some plain text.
No headings here.
`;
    expect(extractHeadings(md)).toEqual([]);
  });

  it("generates slugs with special characters stripped", () => {
    const md = `## What's New in 2024?
## C++ & Rust
`;
    const headings = extractHeadings(md);
    expect(headings[0].id).toBe("whats-new-in-2024");
    expect(headings[1].id).toBe("c-rust");
  });
});
