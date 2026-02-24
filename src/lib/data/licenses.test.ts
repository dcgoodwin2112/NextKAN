import { describe, it, expect } from "vitest";
import { LICENSES, getLicenseByUrl, getLicenseById } from "./licenses";

describe("licenses", () => {
  it("has no duplicate IDs", () => {
    const ids = LICENSES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has valid URLs for all licenses except 'other'", () => {
    for (const license of LICENSES) {
      if (license.id === "other") {
        expect(license.url).toBe("");
      } else {
        expect(license.url).toMatch(/^https?:\/\//);
      }
    }
  });

  it("getLicenseByUrl finds CC0", () => {
    const result = getLicenseByUrl("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(result?.id).toBe("cc-zero");
  });

  it("getLicenseById finds CC-BY", () => {
    const result = getLicenseById("cc-by");
    expect(result?.name).toContain("Attribution");
  });

  it("returns undefined for unknown URL", () => {
    expect(getLicenseByUrl("https://unknown.com")).toBeUndefined();
  });
});
