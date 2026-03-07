import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganization,
  getOrganizationBySlug,
  listOrganizations,
  searchOrganizations,
} from "./organizations";

describe("createOrganization", () => {
  it("validates input and generates slug", async () => {
    prismaMock.organization.create.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      description: null,
      imageUrl: null,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createOrganization({ name: "Test Org" });
    expect(result.name).toBe("Test Org");
    expect(prismaMock.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "test-org" }),
      })
    );
  });

  it("rejects empty name", async () => {
    await expect(createOrganization({ name: "" })).rejects.toThrow();
  });
});

describe("deleteOrganization", () => {
  it("fails when org has datasets", async () => {
    prismaMock.dataset.count.mockResolvedValue(3);
    await expect(deleteOrganization("org-1")).rejects.toThrow(
      /Cannot delete organization/
    );
  });

  it("deletes when org has no datasets", async () => {
    prismaMock.dataset.count.mockResolvedValue(0);
    prismaMock.organization.findUnique.mockResolvedValue({ id: "org-1", name: "Test Org" } as any);
    prismaMock.organization.delete.mockResolvedValue({} as any);
    await deleteOrganization("org-1");
    expect(prismaMock.organization.delete).toHaveBeenCalledWith({
      where: { id: "org-1" },
    });
  });
});

describe("updateOrganization", () => {
  it("updates name and regenerates slug", async () => {
    prismaMock.organization.update.mockResolvedValue({
      id: "org-1",
      name: "Updated Org",
      slug: "updated-org",
      description: null,
      imageUrl: null,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateOrganization("org-1", { name: "Updated Org" });
    expect(result.name).toBe("Updated Org");
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        data: expect.objectContaining({ name: "Updated Org", slug: "updated-org" }),
      })
    );
  });

  it("updates description without changing slug", async () => {
    prismaMock.organization.update.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      description: "New description",
      imageUrl: null,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await updateOrganization("org-1", { description: "New description" });
    expect(prismaMock.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { description: "New description" },
      })
    );
  });
});

describe("getOrganization", () => {
  it("returns organization by id with relations", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      description: null,
      imageUrl: null,
      parentId: null,
      parent: null,
      children: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getOrganization("org-1");
    expect(result?.name).toBe("Test Org");
    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org-1" },
        include: { parent: true, children: true },
      })
    );
  });
});

describe("getOrganizationBySlug", () => {
  it("returns organization by slug with datasets", async () => {
    prismaMock.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      description: null,
      imageUrl: null,
      parentId: null,
      parent: null,
      children: [],
      datasets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getOrganizationBySlug("test-org");
    expect(result?.slug).toBe("test-org");
    expect(prismaMock.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "test-org" },
      })
    );
  });
});

describe("listOrganizations", () => {
  it("returns all organizations", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);
    const result = await listOrganizations();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("searchOrganizations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns organizations and total with pagination", async () => {
    const mockOrgs = [{ id: "org-1", name: "Org One" }];
    prismaMock.organization.findMany.mockResolvedValue(mockOrgs as any);
    prismaMock.organization.count.mockResolvedValue(1);

    const result = await searchOrganizations({ page: 1, limit: 10 });

    expect(result).toEqual({ organizations: mockOrgs, total: 1 });
    expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    );
  });

  it("applies search filter on name and description", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);
    prismaMock.organization.count.mockResolvedValue(0);

    await searchOrganizations({ search: "health data" });

    const call = prismaMock.organization.findMany.mock.calls[0][0];
    expect(call.where).toEqual({
      AND: [
        { OR: [{ name: { contains: "health" } }, { description: { contains: "health" } }] },
        { OR: [{ name: { contains: "data" } }, { description: { contains: "data" } }] },
      ],
    });
  });

  it("applies sort parameter", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);
    prismaMock.organization.count.mockResolvedValue(0);

    await searchOrganizations({ sort: "datasets_desc" });

    const call = prismaMock.organization.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ datasets: { _count: "desc" } });
  });

  it("defaults to name_asc sort", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);
    prismaMock.organization.count.mockResolvedValue(0);

    await searchOrganizations();

    const call = prismaMock.organization.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ name: "asc" });
  });

  it("paginates correctly for page 2", async () => {
    prismaMock.organization.findMany.mockResolvedValue([]);
    prismaMock.organization.count.mockResolvedValue(25);

    const result = await searchOrganizations({ page: 2, limit: 10 });

    expect(result.total).toBe(25);
    expect(prismaMock.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});
