import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/plugins/hooks", () => ({ hooks: { run: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/lib/plugins/loader", () => ({ isPluginsEnabled: vi.fn().mockReturnValue(false) }));

import { GET } from "./route";

describe("GET /data.json", () => {
  beforeEach(() => {
    vi.stubEnv("SITE_URL", "https://test.example.gov");
  });

  it("returns valid DCAT-US catalog JSON", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conformsTo).toBe(
      "https://project-open-data.cio.gov/v1.1/schema"
    );
    expect(body["@type"]).toBe("dcat:Catalog");
    expect(Array.isArray(body.dataset)).toBe(true);
  });

  it("sets Content-Type header", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets Access-Control-Allow-Origin header", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("sets Cache-Control no-store header", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("only queries published datasets", async () => {
    prismaMock.dataset.findMany.mockResolvedValue([]);

    await GET();

    expect(prismaMock.dataset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "published" },
      })
    );
  });
});
