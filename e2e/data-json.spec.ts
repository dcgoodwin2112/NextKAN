import { test, expect } from "@playwright/test";

test.describe("/data.json endpoint", () => {
  test("returns valid DCAT-US v1.1 catalog structure", async ({ request }) => {
    const response = await request.get("/api/data.json");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["access-control-allow-origin"]).toBe("*");
    expect(response.headers()["cache-control"]).toContain("no-store");

    const catalog = await response.json();
    expect(catalog["@context"]).toBe(
      "https://project-open-data.cio.gov/v1.1/schema/catalog.jsonld"
    );
    expect(catalog["@type"]).toBe("dcat:Catalog");
    expect(catalog.conformsTo).toBe(
      "https://project-open-data.cio.gov/v1.1/schema"
    );
    expect(catalog.describedBy).toBe(
      "https://project-open-data.cio.gov/v1.1/schema/catalog.json"
    );
    expect(Array.isArray(catalog.dataset)).toBe(true);
  });

  test("reflects published datasets in the database", async ({ request }) => {
    const response = await request.get("/api/data.json");
    const catalog = await response.json();

    expect(catalog.dataset.length).toBeGreaterThan(0);

    const ds = catalog.dataset.find(
      (d: any) => d.title === "E2E Published Dataset"
    );
    expect(ds).toBeDefined();
    expect(ds.keyword).toContain("e2e");
    expect(ds.publisher).toBeDefined();
    expect(ds.publisher.name).toBe("E2E Test Agency");
  });

  test("does not include draft datasets", async ({ request }) => {
    const response = await request.get("/api/data.json");
    const catalog = await response.json();

    const draft = catalog.dataset.find(
      (d: any) => d.title === "E2E Draft Dataset"
    );
    expect(draft).toBeUndefined();
  });
});
