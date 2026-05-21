import { describe, expect, it } from "vitest";

import { createTokenSchema } from "./api-token";

describe("createTokenSchema", () => {
  it("defaults scope to 'read'", () => {
    const parsed = createTokenSchema.parse({ name: "My token" });
    expect(parsed.scope).toBe("read");
  });

  it("accepts an explicit 'admin' scope", () => {
    const parsed = createTokenSchema.parse({ name: "Bot", scope: "admin" });
    expect(parsed.scope).toBe("admin");
  });

  it("rejects unknown scope values", () => {
    expect(() =>
      createTokenSchema.parse({ name: "Bad", scope: "superuser" as never }),
    ).toThrow();
  });

  it("rejects an empty name", () => {
    expect(() => createTokenSchema.parse({ name: "" })).toThrow();
  });

  it("accepts an expiry under one year", () => {
    const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const parsed = createTokenSchema.parse({
      name: "Half-year token",
      expiresAt: sixMonths,
    });
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });

  it("rejects an expiry beyond one year", () => {
    const twoYears = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    const result = createTokenSchema.safeParse({
      name: "Too long",
      expiresAt: twoYears,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/1 year/);
    }
  });

  it("allows omitting expiry entirely", () => {
    const parsed = createTokenSchema.parse({ name: "Forever-ish" });
    expect(parsed.expiresAt).toBeUndefined();
  });
});
