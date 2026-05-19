import { describe, it, expect } from "vitest";

import { detectPii } from "./pii";

describe("detectPii", () => {
  it("returns false for empty input", () => {
    expect(detectPii([])).toBe(false);
  });

  it("ignores nulls and blank strings entirely", () => {
    expect(detectPii([null, undefined, "", "  "])).toBe(false);
  });

  it("flags an obvious email column", () => {
    expect(
      detectPii([
        "alice@example.com",
        "bob@example.com",
        "carol@example.com",
        "dan@example.com",
      ]),
    ).toBe(true);
  });

  it("flags an SSN column with standard formatting", () => {
    expect(detectPii(["123-45-6789", "987-65-4321", "555-55-5555"])).toBe(true);
  });

  it("flags US phone numbers in multiple formats", () => {
    expect(
      detectPii([
        "(202) 555-0101",
        "202-555-0102",
        "202.555.0103",
        "2025550104",
      ]),
    ).toBe(true);
  });

  it("does not flag a column where only a minority matches", () => {
    expect(
      detectPii(["red", "blue", "green", "alice@example.com", "purple"]),
    ).toBe(false);
  });

  it("does not flag arbitrary text", () => {
    expect(detectPii(["admin", "editor", "viewer", "admin"])).toBe(false);
  });

  it("requires strict SSN format — bare 9-digit numbers do not match", () => {
    expect(detectPii(["123456789", "987654321"])).toBe(false);
  });
});
