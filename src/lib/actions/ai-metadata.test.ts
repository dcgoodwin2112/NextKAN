import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock } from "@/__mocks__/prisma";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/ai", () => ({
  isAiAvailable: vi.fn(),
  generateJson: vi.fn(),
  AiUnavailableError: class AiUnavailableError extends Error {
    constructor(msg?: string) {
      super(msg ?? "unavailable");
      this.name = "AiUnavailableError";
    }
  },
}));

import * as ai from "@/lib/ai";
import {
  annotateDistributionColumns,
  draftDatasetMetadata,
} from "./ai-metadata";

const isAiAvailableMock = vi.mocked(ai.isAiAvailable);
const generateJsonMock = vi.mocked(ai.generateJson);

function makeField(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    dictionaryId: "dict-1",
    name: "id",
    title: null,
    type: "integer",
    description: null,
    format: null,
    constraints: null,
    sortOrder: 0,
    duckdbType: "BIGINT",
    rowCount: 5,
    nullCount: 0,
    distinctCount: 5,
    min: "1",
    max: "5",
    sampleValues: JSON.stringify([1, 2, 3]),
    enumValues: null,
    filterable: true,
    aggregatable: true,
    isPii: false,
    isGeometry: false,
    crs: null,
    descriptionSource: null,
    profiledAt: new Date(),
    extensions: null,
    ...overrides,
  };
}

function makeProfiledDistribution(overrides: Record<string, unknown> = {}) {
  return {
    id: "dist-1",
    title: null,
    description: null,
    downloadURL: null,
    accessURL: null,
    mediaType: "text/csv",
    format: "CSV",
    fileName: "sales.csv",
    filePath: null,
    fileSize: 100,
    sortOrder: 0,
    originalPath: "resources/dist-1/original.csv",
    parquetPath: "resources/dist-1/data.parquet",
    rowCount: 5,
    profiledAt: new Date(),
    profileStatus: "ready",
    profileError: null,
    datasetId: "ds-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    dataset: { title: "Sales", description: "Quarterly sales by region" },
    dataDictionary: {
      id: "dict-1",
      distributionId: "dist-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      fields: [makeField()],
    },
    ...overrides,
  };
}

beforeEach(() => {
  isAiAvailableMock.mockReset();
  generateJsonMock.mockReset();
});

describe("draftDatasetMetadata", () => {
  it("throws AiUnavailableError when key is missing", async () => {
    isAiAvailableMock.mockReturnValue(false);
    await expect(draftDatasetMetadata("dist-1")).rejects.toThrow("unavailable");
    expect(generateJsonMock).not.toHaveBeenCalled();
  });

  it("throws when the distribution does not exist", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(null as any);
    await expect(draftDatasetMetadata("missing")).rejects.toThrow(
      /Distribution not found/,
    );
  });

  it("refuses to draft when distribution is not profiled", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue({
      ...makeProfiledDistribution({ profileStatus: "pending" }),
    } as any);
    await expect(draftDatasetMetadata("dist-1")).rejects.toThrow(
      /not profiled yet/,
    );
  });

  it("returns AI suggestions matching the schema", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeProfiledDistribution() as any,
    );
    generateJsonMock.mockResolvedValue({
      title: "Quarterly Sales",
      description: "Sales by region.",
      keywords: ["sales", "quarterly"],
    });

    const result = await draftDatasetMetadata("dist-1");

    expect(result).toEqual({
      title: "Quarterly Sales",
      description: "Sales by region.",
      keywords: ["sales", "quarterly"],
    });
    const call = generateJsonMock.mock.calls[0][0];
    expect(call.system).toMatch(/metadata assistant/);
    expect(call.prompt).toContain("Source filename: sales.csv");
    expect(call.prompt).toContain("Row count: 5");
  });
});

describe("annotateDistributionColumns", () => {
  it("throws AiUnavailableError when key is missing", async () => {
    isAiAvailableMock.mockReturnValue(false);
    await expect(annotateDistributionColumns("dist-1")).rejects.toThrow(
      "unavailable",
    );
  });

  it("throws when distribution has no profiled columns", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeProfiledDistribution({ dataDictionary: { fields: [] } }) as any,
    );
    await expect(annotateDistributionColumns("dist-1")).rejects.toThrow(
      /no profiled columns/,
    );
  });

  it("persists annotations with descriptionSource ai_generated", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeProfiledDistribution({
        dataDictionary: {
          id: "dict-1",
          fields: [
            makeField({ id: "f-id", name: "id", type: "integer" }),
            makeField({ id: "f-name", name: "name", type: "string" }),
          ],
        },
      }) as any,
    );
    generateJsonMock.mockResolvedValue({
      id: { description: "Row identifier", unit: null },
      name: { description: "Customer name", unit: null },
    });

    const tx = { dataDictionaryField: { update: vi.fn().mockResolvedValue({}) } };
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const outcome = await annotateDistributionColumns("dist-1");

    expect(outcome).toEqual({ updated: 2, skipped: 0 });
    expect(tx.dataDictionaryField.update).toHaveBeenCalledTimes(2);
    expect(tx.dataDictionaryField.update).toHaveBeenCalledWith({
      where: { id: "f-id" },
      data: {
        description: "Row identifier",
        descriptionSource: "ai_generated",
      },
    });
    expect(tx.dataDictionaryField.update).toHaveBeenCalledWith({
      where: { id: "f-name" },
      data: {
        description: "Customer name",
        descriptionSource: "ai_generated",
      },
    });
  });

  it("appends unit hints to the description when provided", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeProfiledDistribution({
        dataDictionary: {
          id: "dict-1",
          fields: [makeField({ id: "f-amt", name: "amount", type: "number" })],
        },
      }) as any,
    );
    generateJsonMock.mockResolvedValue({
      amount: { description: "Sale amount", unit: "USD" },
    });

    const tx = { dataDictionaryField: { update: vi.fn().mockResolvedValue({}) } };
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await annotateDistributionColumns("dist-1");

    expect(tx.dataDictionaryField.update).toHaveBeenCalledWith({
      where: { id: "f-amt" },
      data: {
        description: "Sale amount (unit: USD)",
        descriptionSource: "ai_generated",
      },
    });
  });

  it("counts skipped fields when AI omits some columns", async () => {
    isAiAvailableMock.mockReturnValue(true);
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeProfiledDistribution({
        dataDictionary: {
          id: "dict-1",
          fields: [
            makeField({ id: "f1", name: "a", type: "string" }),
            makeField({ id: "f2", name: "b", type: "string" }),
            makeField({ id: "f3", name: "c", type: "string" }),
          ],
        },
      }) as any,
    );
    generateJsonMock.mockResolvedValue({
      a: { description: "field a", unit: null },
      // b and c missing
    });

    const tx = { dataDictionaryField: { update: vi.fn().mockResolvedValue({}) } };
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const outcome = await annotateDistributionColumns("dist-1");
    expect(outcome).toEqual({ updated: 1, skipped: 2 });
    expect(tx.dataDictionaryField.update).toHaveBeenCalledTimes(1);
  });
});
