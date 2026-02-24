// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { getOpenApiSpec } from "@/lib/openapi";

describe("GET /api/openapi.json", () => {
  it("returns valid OpenAPI 3.0.3 spec", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.openapi).toBe("3.0.3");
    expect(body.info.title).toBe("NextKAN API");
    expect(body.info.version).toBe("1.0.0");
  });

  it("includes all expected API paths", async () => {
    const response = await GET();
    const body = await response.json();
    const paths = Object.keys(body.paths);

    // Spot-check key endpoints exist
    expect(paths).toContain("/data.json");
    expect(paths).toContain("/api/datasets");
    expect(paths).toContain("/api/datasets/{id}");
    expect(paths).toContain("/api/organizations");
    expect(paths).toContain("/api/datastore/{distributionId}");
    expect(paths).toContain("/api/datastore/sql");
    expect(paths).toContain("/api/charts");
    expect(paths).toContain("/api/activity");
    expect(paths).toContain("/api/export");
    // Should have a reasonable number of paths
    expect(paths.length).toBeGreaterThanOrEqual(10);
  });

  it("returns JSON content-type", async () => {
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("getOpenApiSpec includes server URL", () => {
    const spec = getOpenApiSpec("https://data.example.gov");
    expect(spec.servers).toEqual([{ url: "https://data.example.gov" }]);
  });
});
