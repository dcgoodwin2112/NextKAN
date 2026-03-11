import { describe, it, expect } from "vitest";
import { truncateText, formatDate } from "./format";

describe("truncateText", () => {
  it("returns text unchanged when shorter than maxLength", () => {
    expect(truncateText("hello", 10)).toBe("hello");
  });

  it("returns text unchanged when exactly maxLength", () => {
    expect(truncateText("hello", 5)).toBe("hello");
  });

  it("truncates and adds ellipsis when longer than maxLength", () => {
    expect(truncateText("hello world", 5)).toBe("hello...");
  });

  it("handles empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    const result = formatDate(new Date("2024-06-15T00:00:00Z"));
    expect(result).toBe("Jun 15, 2024");
  });

  it("formats an ISO string", () => {
    const result = formatDate("2024-01-01T00:00:00Z");
    expect(result).toBe("Jan 1, 2024");
  });

  it("formats consistently regardless of timezone (uses UTC)", () => {
    const result = formatDate("2024-12-31T23:59:59Z");
    expect(result).toBe("Dec 31, 2024");
  });
});
