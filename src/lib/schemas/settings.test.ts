import { describe, it, expect } from "vitest";
import { settingsUpdateSchema } from "./settings";

describe("settingsUpdateSchema", () => {
  it("accepts valid partial update", () => {
    const result = settingsUpdateSchema.parse({
      SITE_NAME: "My Catalog",
      ENABLE_COMMENTS: "true",
    });
    expect(result.SITE_NAME).toBe("My Catalog");
    expect(result.ENABLE_COMMENTS).toBe("true");
  });

  it("accepts empty object", () => {
    const result = settingsUpdateSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects invalid SITE_URL", () => {
    expect(() =>
      settingsUpdateSchema.parse({ SITE_URL: "not-a-url" })
    ).toThrow();
  });

  it("rejects invalid boolean toggle", () => {
    expect(() =>
      settingsUpdateSchema.parse({ ENABLE_COMMENTS: "yes" })
    ).toThrow();
  });

  it("rejects invalid DCAT_US_VERSION", () => {
    expect(() =>
      settingsUpdateSchema.parse({ DCAT_US_VERSION: "v2.0" })
    ).toThrow();
  });

  it("accepts v1.1 and v3.0 for DCAT_US_VERSION", () => {
    expect(settingsUpdateSchema.parse({ DCAT_US_VERSION: "v1.1" })).toEqual({
      DCAT_US_VERSION: "v1.1",
    });
    expect(settingsUpdateSchema.parse({ DCAT_US_VERSION: "v3.0" })).toEqual({
      DCAT_US_VERSION: "v3.0",
    });
  });

  it("rejects empty SITE_NAME", () => {
    expect(() =>
      settingsUpdateSchema.parse({ SITE_NAME: "" })
    ).toThrow();
  });

  it("accepts all toggle values", () => {
    const result = settingsUpdateSchema.parse({
      ENABLE_COMMENTS: "false",
      COMMENT_MODERATION: "true",
      ENABLE_WORKFLOW: "false",
      ENABLE_PLUGINS: "false",
    });
    expect(result.ENABLE_COMMENTS).toBe("false");
    expect(result.COMMENT_MODERATION).toBe("true");
  });
});
