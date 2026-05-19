import { describe, it, expect } from "vitest";

import { escapeSqlIdentifier, escapeSqlLiteral } from "./escape";

describe("escapeSqlLiteral", () => {
  it("wraps plain text in single quotes", () => {
    expect(escapeSqlLiteral("hello")).toBe("'hello'");
  });

  it("doubles embedded single quotes", () => {
    expect(escapeSqlLiteral("O'Brien")).toBe("'O''Brien'");
  });

  it("handles absolute paths", () => {
    expect(escapeSqlLiteral("/tmp/file.csv")).toBe("'/tmp/file.csv'");
  });

  it("handles paths containing quotes (defense-in-depth)", () => {
    expect(escapeSqlLiteral("/tmp/it's.csv")).toBe("'/tmp/it''s.csv'");
  });
});

describe("escapeSqlIdentifier", () => {
  it("wraps in double quotes", () => {
    expect(escapeSqlIdentifier("col")).toBe('"col"');
  });

  it("doubles embedded double quotes", () => {
    expect(escapeSqlIdentifier('weird"name')).toBe('"weird""name"');
  });

  it("preserves whitespace and special characters", () => {
    expect(escapeSqlIdentifier("Total Revenue ($)")).toBe('"Total Revenue ($)"');
  });
});
