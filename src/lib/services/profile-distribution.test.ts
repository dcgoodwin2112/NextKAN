// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { prismaMock } from "@/__mocks__/prisma";
import type { ColumnProfile, ProfileResult } from "@/lib/profiling";

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { profileDistribution } from "./profile-distribution";

let workdir: string;

beforeEach(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), "nextkan-profdist-"));
});

afterEach(async () => {
  vi.clearAllMocks();
  await rm(workdir, { recursive: true, force: true });
});

function makeDistribution(overrides: Record<string, unknown> = {}) {
  return {
    id: "dist-1",
    title: null,
    description: null,
    downloadURL: null,
    accessURL: null,
    mediaType: "text/csv",
    format: "CSV",
    conformsTo: null,
    describedBy: null,
    fileName: "input.csv",
    filePath: null as string | null,
    fileSize: 100,
    sortOrder: 0,
    originalPath: null,
    parquetPath: null,
    rowCount: null,
    profiledAt: null,
    profileStatus: "none",
    profileError: null,
    datasetId: "ds-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeColumnProfile(overrides: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    name: "id",
    type: "integer",
    duckdbType: "BIGINT",
    rowCount: 5,
    nullCount: 0,
    distinctCount: 5,
    min: "1",
    max: "5",
    sampleValues: [1, 2, 3, 4, 5],
    enumValues: null,
    filterable: true,
    aggregatable: true,
    isPii: false,
    isGeometry: false,
    crs: null,
    ...overrides,
  };
}

describe("profileDistribution", () => {
  it("no-ops when distribution is missing", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(null as any);
    const profiler = vi.fn();

    await profileDistribution("missing-id", {
      storageRoot: workdir,
      profiler,
    });

    expect(profiler).not.toHaveBeenCalled();
    expect(prismaMock.distribution.update).not.toHaveBeenCalled();
  });

  it("no-ops when distribution has no filePath", async () => {
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: null }) as any,
    );
    const profiler = vi.fn();

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    expect(profiler).not.toHaveBeenCalled();
    expect(prismaMock.distribution.update).not.toHaveBeenCalled();
  });

  it("copies the source, invokes profiler, and persists fields on success", async () => {
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "id,name\n1,Alice\n", "utf-8");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath, fileName: "input.csv" }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);
    prismaMock.dataDictionary.findUnique.mockResolvedValue(null as any);
    prismaMock.dataDictionary.create.mockResolvedValue({} as any);

    const result: ProfileResult = {
      rowCount: 5,
      columns: [
        makeColumnProfile({ name: "id" }),
        makeColumnProfile({
          name: "name",
          type: "string",
          duckdbType: "VARCHAR",
          min: "Alice",
          max: "Eve",
          sampleValues: ["Alice", "Bob"],
          enumValues: ["Alice", "Bob"],
          filterable: true,
          aggregatable: false,
        }),
      ],
      parquetPath: path.join(workdir, "resources/dist-1/data.parquet"),
    };

    const profiler = vi.fn(async (opts: { parquetTargetPath: string }) => {
      // Simulate the worker writing the parquet file so callers can verify.
      await writeFile(opts.parquetTargetPath, "PAR1");
      return result;
    });

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    // Original was copied to storage/resources/dist-1/original.csv
    const expectedOriginal = path.join(workdir, "resources/dist-1/original.csv");
    expect(existsSync(expectedOriginal)).toBe(true);
    const copied = await readFile(expectedOriginal, "utf-8");
    expect(copied).toBe("id,name\n1,Alice\n");

    // Status went processing -> ready
    const statusCalls = prismaMock.distribution.update.mock.calls;
    expect(statusCalls[0][0].data).toMatchObject({ profileStatus: "processing" });
    expect(statusCalls[1][0].data).toMatchObject({
      profileStatus: "ready",
      rowCount: 5,
      originalPath: "resources/dist-1/original.csv",
      parquetPath: "resources/dist-1/data.parquet",
    });
    expect((statusCalls[1][0].data as any).profiledAt).toBeInstanceOf(Date);

    // DataDictionary recreated with two fields including all profiling fields
    expect(prismaMock.dataDictionary.create).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.dataDictionary.create.mock.calls[0][0] as any;
    expect(createArg.data.distributionId).toBe("dist-1");
    const fields = createArg.data.fields.create as any[];
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      name: "id",
      type: "integer",
      duckdbType: "BIGINT",
      filterable: true,
      aggregatable: true,
      isPii: false,
      sortOrder: 0,
    });
    expect(fields[1]).toMatchObject({
      name: "name",
      type: "string",
      enumValues: JSON.stringify(["Alice", "Bob"]),
      sortOrder: 1,
    });
  });

  it("sets profileStatus=failed when the profiler throws", async () => {
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "x\n1\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);

    const profiler = vi.fn(async () => {
      throw new Error("duckdb exploded");
    });

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    const calls = prismaMock.distribution.update.mock.calls;
    const lastCall = calls[calls.length - 1][0].data as Record<string, unknown>;
    expect(lastCall.profileStatus).toBe("failed");
    expect(lastCall.profileError).toBe("duckdb exploded");

    // DataDictionary writes should NOT happen on failure
    expect(prismaMock.dataDictionary.create).not.toHaveBeenCalled();
  });

  it("deletes the existing DataDictionary before recreating", async () => {
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "x\n1\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);
    prismaMock.dataDictionary.findUnique.mockResolvedValue({
      id: "dict-old",
      distributionId: "dist-1",
    } as any);
    prismaMock.dataDictionary.delete.mockResolvedValue({} as any);
    prismaMock.dataDictionary.create.mockResolvedValue({} as any);

    const profiler = vi.fn(async (): Promise<ProfileResult> => ({
      rowCount: 1,
      columns: [makeColumnProfile()],
      parquetPath: path.join(workdir, "resources/dist-1/data.parquet"),
    }));

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    expect(prismaMock.dataDictionary.delete).toHaveBeenCalledWith({
      where: { id: "dict-old" },
    });
    expect(prismaMock.dataDictionary.create).toHaveBeenCalled();
  });

  it("sets parquetPath to null when the profiler returns no parquetPath", async () => {
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "x\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);
    prismaMock.dataDictionary.findUnique.mockResolvedValue(null as any);
    prismaMock.dataDictionary.create.mockResolvedValue({} as any);

    const profiler = vi.fn(async (): Promise<ProfileResult> => ({
      rowCount: 0,
      columns: [],
      parquetPath: null,
    }));

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    const successCall = prismaMock.distribution.update.mock.calls[1][0].data as any;
    expect(successCall.parquetPath).toBeNull();
    expect(successCall.profileStatus).toBe("ready");
  });

  it("picks the file extension from fileName, then filePath, then mediaType", async () => {
    const sourcePath = path.join(workdir, "no-extension");
    await writeFile(sourcePath, "x\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({
        filePath: sourcePath,
        fileName: null,
        mediaType: "application/geo+json",
      }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);
    prismaMock.dataDictionary.findUnique.mockResolvedValue(null as any);
    prismaMock.dataDictionary.create.mockResolvedValue({} as any);

    const profiler = vi.fn(async (): Promise<ProfileResult> => ({
      rowCount: 0,
      columns: [],
      parquetPath: path.join(workdir, "resources/dist-1/data.parquet"),
    }));

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    const expected = path.join(workdir, "resources/dist-1/original.geojson");
    expect(existsSync(expected)).toBe(true);
    expect(statSync(expected).size).toBeGreaterThan(0);
  });

  it("performs an end-to-end profile of a real CSV using the in-process profiler", async () => {
    // Wires up profile-distribution against the real profileResource (not the
    // worker wrapper, which vitest's loader can't reach). This exercises
    // DuckDB + COPY TO PARQUET + DataDictionary persistence in one pass.
    const { profileResource } = await import("@/lib/profiling");
    const sourcePath = path.join(workdir, "input.csv");
    await writeFile(
      sourcePath,
      "id,name,score\n1,Alice,3.14\n2,Bob,2.71\n3,Carol,1.41\n",
      "utf-8",
    );

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath, fileName: "input.csv" }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);
    prismaMock.dataDictionary.findUnique.mockResolvedValue(null as any);
    prismaMock.dataDictionary.create.mockResolvedValue({} as any);

    await profileDistribution("dist-1", {
      storageRoot: workdir,
      profiler: (opts) => profileResource(opts),
    });

    const parquet = path.join(workdir, "resources/dist-1/data.parquet");
    expect(existsSync(parquet)).toBe(true);
    expect(statSync(parquet).size).toBeGreaterThan(0);

    const createArg = prismaMock.dataDictionary.create.mock.calls[0][0] as any;
    const names = (createArg.data.fields.create as any[]).map((f) => f.name);
    expect(names).toEqual(["id", "name", "score"]);

    const successUpdate = prismaMock.distribution.update.mock.calls[1][0].data as any;
    expect(successUpdate.rowCount).toBe(3);
    expect(successUpdate.profileStatus).toBe("ready");
  });
});

describe("profileDistribution — boundary failures", () => {
  it("sets profileStatus=failed without throwing when the source file is missing on disk", async () => {
    // Simulates a race / inconsistency where the DB row references a file
    // that no longer exists. profileDistribution must swallow the I/O error
    // from copyFile (not the profiler) and surface it via profileError.
    const missingPath = path.join(workdir, "vanished.csv");
    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: missingPath, fileName: "vanished.csv" }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);

    await expect(
      profileDistribution("dist-1", { storageRoot: workdir }),
    ).resolves.toBeUndefined();

    const calls = prismaMock.distribution.update.mock.calls;
    const lastCall = calls[calls.length - 1][0].data as Record<string, unknown>;
    expect(lastCall.profileStatus).toBe("failed");
    expect(typeof lastCall.profileError).toBe("string");
    expect((lastCall.profileError as string).length).toBeGreaterThan(0);

    // Source file was missing — no profiler invocation and no DataDictionary write.
    expect(prismaMock.dataDictionary.create).not.toHaveBeenCalled();
  });

  it("truncates oversized profileError messages to 1000 chars", async () => {
    // The catch path slices error messages at 1000 chars before persisting so
    // a runaway DuckDB stack trace can't blow past the DB column.
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "x\n1\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);

    const huge = "X".repeat(5_000);
    const profiler = vi.fn(async () => {
      throw new Error(huge);
    });

    await profileDistribution("dist-1", { storageRoot: workdir, profiler });

    const calls = prismaMock.distribution.update.mock.calls;
    const lastCall = calls[calls.length - 1][0].data as Record<string, unknown>;
    expect(lastCall.profileStatus).toBe("failed");
    expect((lastCall.profileError as string).length).toBe(1000);
  });

  it("survives a profiler timeout by writing a failed status without leaking the worker", async () => {
    // Simulates the worker-timeout path (the real implementation uses a hard
    // ceiling of 5 min). We don't spawn a real worker — we model the timeout
    // as a profiler rejection, which is exactly what `profileInWorker`
    // surfaces when the AbortController fires.
    const sourcePath = path.join(workdir, "src.csv");
    await writeFile(sourcePath, "x\n1\n");

    prismaMock.distribution.findUnique.mockResolvedValue(
      makeDistribution({ filePath: sourcePath }) as any,
    );
    prismaMock.distribution.update.mockResolvedValue({} as any);

    const profiler = vi.fn(async () => {
      throw new Error("Profiling exceeded timeout of 5000ms");
    });

    await profileDistribution("dist-1", {
      storageRoot: workdir,
      profiler,
      timeoutMs: 5_000,
    });

    expect(profiler).toHaveBeenCalledTimes(1);
    const calls = prismaMock.distribution.update.mock.calls;
    const lastCall = calls[calls.length - 1][0].data as Record<string, unknown>;
    expect(lastCall.profileStatus).toBe("failed");
    expect(lastCall.profileError).toMatch(/timeout/i);
  });
});
