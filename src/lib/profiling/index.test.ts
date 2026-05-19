// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { profileResource } from "./index";

const FIXTURES = path.join(process.cwd(), "test-data");

let tmpRoot: string;
const cleanup: string[] = [];

beforeAll(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "nextkan-profile-"));
});

afterEach(async () => {
  while (cleanup.length > 0) {
    const dir = cleanup.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function newOutputPath(name = "data.parquet"): Promise<string> {
  const dir = await mkdtemp(path.join(tmpRoot, "case-"));
  cleanup.push(dir);
  return path.join(dir, name);
}

describe("profileResource (CSV)", () => {
  it("returns row count, columns, and writes Parquet", async () => {
    const target = await newOutputPath();
    const result = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-basic.csv"),
      parquetTargetPath: target,
    });

    expect(result.rowCount).toBe(5);
    expect(result.parquetPath).toBe(target);
    expect(existsSync(target)).toBe(true);
    expect(statSync(target).size).toBeGreaterThan(0);

    const byName = new Map(result.columns.map((c) => [c.name, c]));
    expect(byName.get("id")?.type).toBe("integer");
    expect(byName.get("name")?.type).toBe("string");
    expect(byName.get("score")?.type).toBe("number");
    expect(byName.get("is_active")?.type).toBe("boolean");
    expect(byName.get("joined_at")?.type).toBe("date");
  });

  it("applies filterable/aggregatable heuristics", async () => {
    const target = await newOutputPath();
    const { columns } = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-basic.csv"),
      parquetTargetPath: target,
    });
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("score")?.aggregatable).toBe(true);
    expect(byName.get("name")?.aggregatable).toBe(false);
    expect(byName.get("is_active")?.filterable).toBe(true);
    expect(byName.get("name")?.filterable).toBe(true);
  });

  it("collects sample values per column", async () => {
    const target = await newOutputPath();
    const { columns } = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-basic.csv"),
      parquetTargetPath: target,
      sampleSize: 3,
    });
    const name = columns.find((c) => c.name === "name");
    expect(name?.sampleValues.length).toBeGreaterThan(0);
    expect(name?.sampleValues.length).toBeLessThanOrEqual(3);
  });

  it("flags PII columns based on sample values", async () => {
    const target = await newOutputPath();
    const { columns } = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-pii.csv"),
      parquetTargetPath: target,
    });
    const byName = new Map(columns.map((c) => [c.name, c]));

    expect(byName.get("email")?.isPii).toBe(true);
    expect(byName.get("ssn")?.isPii).toBe(true);
    expect(byName.get("phone")?.isPii).toBe(true);
    expect(byName.get("role")?.isPii).toBe(false);
  });

  it("populates enumValues for low-cardinality string columns", async () => {
    const target = await newOutputPath();
    const { columns } = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-pii.csv"),
      parquetTargetPath: target,
    });
    const role = columns.find((c) => c.name === "role");
    expect(role?.enumValues).not.toBeNull();
    expect(role?.enumValues?.length).toBeGreaterThan(0);
  });

  it("creates parent directories of the target path on demand", async () => {
    const dir = await mkdtemp(path.join(tmpRoot, "nested-"));
    cleanup.push(dir);
    const target = path.join(dir, "deeply", "nested", "out.parquet");
    await profileResource({
      sourcePath: path.join(FIXTURES, "profile-basic.csv"),
      parquetTargetPath: target,
    });
    expect(existsSync(target)).toBe(true);
  });
});

describe("profileResource (Parquet pass-through)", () => {
  it("can profile a Parquet file produced by an earlier run", async () => {
    const first = await newOutputPath("first.parquet");
    await profileResource({
      sourcePath: path.join(FIXTURES, "profile-basic.csv"),
      parquetTargetPath: first,
    });

    const second = await newOutputPath("second.parquet");
    const result = await profileResource({
      sourcePath: first,
      parquetTargetPath: second,
    });

    expect(result.rowCount).toBe(5);
    expect(existsSync(second)).toBe(true);
  });
});

describe("profileResource (synthetic large CSV)", () => {
  it("profiles ~10MB of data within a reasonable time budget", async () => {
    const dir = await mkdtemp(path.join(tmpRoot, "large-"));
    cleanup.push(dir);
    const src = path.join(dir, "large.csv");

    const rows = ["id,group,value"];
    const target_rows = 200_000;
    for (let i = 0; i < target_rows; i++) {
      rows.push(`${i},g${i % 25},${(i * 7.13).toFixed(2)}`);
    }
    await writeFile(src, rows.join("\n"));

    const out = path.join(dir, "out.parquet");
    const start = Date.now();
    const result = await profileResource({
      sourcePath: src,
      parquetTargetPath: out,
    });
    const elapsed = Date.now() - start;

    expect(result.rowCount).toBe(target_rows);
    expect(elapsed).toBeLessThan(15_000);
  }, 30_000);
});

describe("profileResource (failure surfaces)", () => {
  it("rejects when the source file is missing", async () => {
    const target = await newOutputPath();
    await expect(
      profileResource({
        sourcePath: path.join(FIXTURES, "no-such-file.csv"),
        parquetTargetPath: target,
      }),
    ).rejects.toThrow();
  });

  it("permissively profiles a malformed CSV (DuckDB salvages what it can)", async () => {
    // DuckDB's CSV sniffer is permissive — it never throws on shape mismatches,
    // it just produces a degenerate schema. We assert the documented behavior
    // so a future regression to strict-mode CSV reading is loud.
    const target = await newOutputPath();
    const result = await profileResource({
      sourcePath: path.join(FIXTURES, "profile-malformed.csv"),
      parquetTargetPath: target,
    });
    expect(result.columns.length).toBeGreaterThan(0);
  });
});
