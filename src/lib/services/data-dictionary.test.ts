import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => {
  const mock = await import("@/__mocks__/prisma");
  return { prisma: mock.default };
});

import { prismaMock } from "@/__mocks__/prisma";
import {
  autoGenerateFromDatastore,
  getDataDictionary,
  updateDataDictionary,
  exportFrictionless,
} from "./data-dictionary";
import type { DatastoreColumn } from "@/lib/schemas/datastore";

describe("data-dictionary service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("autoGenerateFromDatastore", () => {
    it("creates a dictionary with mapped field types", async () => {
      const columns: DatastoreColumn[] = [
        { name: "name", type: "TEXT" },
        { name: "age", type: "INTEGER" },
        { name: "score", type: "REAL" },
        { name: "active", type: "BOOLEAN" },
      ];

      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue(null);
      (prismaMock.dataDictionary.create as any).mockResolvedValue({
        id: "dict-1",
      });

      await autoGenerateFromDatastore("dist-1", columns);

      expect(prismaMock.dataDictionary.create).toHaveBeenCalledWith({
        data: {
          distributionId: "dist-1",
          fields: {
            create: [
              { name: "name", type: "string", sortOrder: 0 },
              { name: "age", type: "integer", sortOrder: 1 },
              { name: "score", type: "number", sortOrder: 2 },
              { name: "active", type: "boolean", sortOrder: 3 },
            ],
          },
        },
      });
    });

    it("maps datastore types correctly", async () => {
      const columns: DatastoreColumn[] = [{ name: "val", type: "TEXT" }];

      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue(null);
      (prismaMock.dataDictionary.create as any).mockResolvedValue({
        id: "dict-2",
      });

      await autoGenerateFromDatastore("dist-2", columns);

      const createCall = (prismaMock.dataDictionary.create as any).mock
        .calls[0][0];
      expect(createCall.data.fields.create[0].type).toBe("string");
    });

    it("deletes existing dictionary before recreating", async () => {
      const columns: DatastoreColumn[] = [{ name: "x", type: "TEXT" }];

      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue({
        id: "existing-dict",
      });
      (prismaMock.dataDictionary.delete as any).mockResolvedValue({});
      (prismaMock.dataDictionary.create as any).mockResolvedValue({
        id: "new-dict",
      });

      await autoGenerateFromDatastore("dist-3", columns);

      expect(prismaMock.dataDictionary.delete).toHaveBeenCalledWith({
        where: { id: "existing-dict" },
      });
    });
  });

  describe("getDataDictionary", () => {
    it("returns dictionary with ordered fields", async () => {
      const mockDict = {
        id: "dict-1",
        distributionId: "dist-1",
        fields: [
          { id: "f1", name: "col_a", type: "string", sortOrder: 0 },
          { id: "f2", name: "col_b", type: "integer", sortOrder: 1 },
        ],
      };
      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue(
        mockDict
      );

      const result = await getDataDictionary("dist-1");

      expect(result).toEqual(mockDict);
      expect(prismaMock.dataDictionary.findUnique).toHaveBeenCalledWith({
        where: { distributionId: "dist-1" },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
    });
  });

  describe("updateDataDictionary", () => {
    it("replaces all fields when updating", async () => {
      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue({
        id: "dict-1",
      });
      (prismaMock.dataDictionaryField.deleteMany as any).mockResolvedValue({});
      (prismaMock.dataDictionaryField.createMany as any).mockResolvedValue({
        count: 1,
      });

      await updateDataDictionary("dist-1", [
        { name: "col_a", type: "string", sortOrder: 0 },
      ]);

      expect(prismaMock.dataDictionaryField.deleteMany).toHaveBeenCalledWith({
        where: { dictionaryId: "dict-1" },
      });
      expect(
        prismaMock.dataDictionaryField.createMany
      ).toHaveBeenCalledWith({
        data: [
          {
            dictionaryId: "dict-1",
            name: "col_a",
            title: null,
            type: "string",
            description: null,
            format: null,
            constraints: null,
            sortOrder: 0,
          },
        ],
      });
    });
  });

  describe("exportFrictionless", () => {
    it("returns Frictionless Table Schema format", async () => {
      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue({
        id: "dict-1",
        fields: [
          {
            id: "f1",
            name: "id",
            type: "integer",
            title: "Record ID",
            description: "Unique identifier",
            format: null,
            constraints: null,
            sortOrder: 0,
          },
          {
            id: "f2",
            name: "name",
            type: "string",
            title: null,
            description: null,
            format: null,
            constraints: null,
            sortOrder: 1,
          },
        ],
      });

      const result = await exportFrictionless("dist-1");

      expect(result).toEqual({
        fields: [
          {
            name: "id",
            type: "integer",
            title: "Record ID",
            description: "Unique identifier",
          },
          { name: "name", type: "string" },
        ],
      });
    });

    it("returns null when no dictionary exists", async () => {
      (prismaMock.dataDictionary.findUnique as any).mockResolvedValue(null);

      const result = await exportFrictionless("dist-nonexistent");
      expect(result).toBeNull();
    });
  });
});
