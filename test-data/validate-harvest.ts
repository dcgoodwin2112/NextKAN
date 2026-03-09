/**
 * Harvest feature validation script.
 * Run with: npx tsx test-data/validate-harvest.ts
 *
 * Tests: DCAT-US self-harvest, fixture catalog harvest, error handling,
 * re-run deduplication, source management, discovery endpoint, external trigger API.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const BASE_URL = "http://localhost:3000";

// Track IDs for cleanup
const createdSourceIds: string[] = [];
const createdDatasetIds: string[] = [];

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
}
function heading(msg: string) {
  console.log(`\n${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}`);
}

async function getOrg(): Promise<{ id: string; name: string }> {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organizations in DB — seed first");
  return { id: org.id, name: org.name };
}

// ─── Step 1: Create fixture catalog harvest source ─────────────────────────
async function step1_createFixtureSource(orgId: string) {
  heading("Step 1: Create fixture catalog harvest source");

  const source = await prisma.harvestSource.create({
    data: {
      name: "Fixture Catalog Test",
      url: `${BASE_URL}/api/test/fixture-catalog`,
      type: "dcat-us",
      organizationId: orgId,
      enabled: true,
    },
  });
  createdSourceIds.push(source.id);

  if (source.name === "Fixture Catalog Test") pass("Source created with correct name");
  else fail(`Expected name 'Fixture Catalog Test', got '${source.name}'`);

  if (source.type === "dcat-us") pass("Source type is dcat-us");
  else fail(`Expected type 'dcat-us', got '${source.type}'`);

  if (source.enabled) pass("Source is enabled");
  else fail("Source should be enabled");

  // Verify in list
  const sources = await prisma.harvestSource.findMany({
    where: { id: source.id },
  });
  if (sources.length === 1) pass("Source appears in DB list");
  else fail("Source not found in DB");

  return source.id;
}

// ─── Step 2: Run harvest via the service ────────────────────────────────────
async function step2_runHarvest(sourceId: string) {
  heading("Step 2: Run fixture catalog harvest");

  // Import and run harvest (uses same DB)
  const { runHarvest } = await import("../src/lib/services/harvest");
  const result = await runHarvest(sourceId);

  console.log("  Result:", JSON.stringify(result, null, 2));

  if (result.datasetsCreated === 2) pass("Created exactly 2 datasets");
  else fail(`Expected 2 created, got ${result.datasetsCreated}`);

  if (result.datasetsUpdated === 0) pass("No updates (first run)");
  else fail(`Expected 0 updated, got ${result.datasetsUpdated}`);

  if (result.datasetsDeleted === 0) pass("No archived datasets");
  else fail(`Expected 0 deleted, got ${result.datasetsDeleted}`);

  if (result.errors.length === 0) pass("No errors");
  else fail(`Errors: ${result.errors.join(", ")}`);

  // Verify job record
  const jobs = await prisma.harvestJob.findMany({
    where: { sourceId },
    orderBy: { startedAt: "desc" },
  });
  if (jobs.length === 1) pass("One harvest job recorded");
  else fail(`Expected 1 job, got ${jobs.length}`);

  if (jobs[0]?.status === "success") pass("Job status is 'success'");
  else fail(`Expected job status 'success', got '${jobs[0]?.status}'`);

  // Verify source updated
  const source = await prisma.harvestSource.findUnique({
    where: { id: sourceId },
  });
  if (source?.lastStatus === "success") pass("Source lastStatus is 'success'");
  else fail(`Expected source lastStatus 'success', got '${source?.lastStatus}'`);

  // Verify harvested datasets
  const datasets = await prisma.dataset.findMany({
    where: { harvestSourceId: sourceId, deletedAt: null },
    include: { distributions: true },
  });

  for (const d of datasets) createdDatasetIds.push(d.id);

  if (datasets.length === 2) pass("2 datasets in DB linked to source");
  else fail(`Expected 2 datasets, got ${datasets.length}`);

  const ds1 = datasets.find((d) => d.harvestIdentifier === "test-harvest-1");
  const ds2 = datasets.find((d) => d.harvestIdentifier === "test-harvest-2");

  if (ds1) {
    pass(`Dataset 1: "${ds1.title}"`);
    if (ds1.distributions.length === 1)
      pass("Dataset 1 has 1 distribution (CSV)");
    else fail(`Dataset 1 distributions: ${ds1.distributions.length}`);
  } else {
    fail("Dataset 1 (test-harvest-1) not found");
  }

  if (ds2) {
    pass(`Dataset 2: "${ds2.title}"`);
  } else {
    fail("Dataset 2 (test-harvest-2) not found");
  }
}

// ─── Step 3: Re-run harvest (deduplication check) ──────────────────────────
async function step3_rerunHarvest(sourceId: string) {
  heading("Step 3: Re-run harvest (deduplication)");

  const { runHarvest } = await import("../src/lib/services/harvest");
  const result = await runHarvest(sourceId);

  console.log("  Result:", JSON.stringify(result, null, 2));

  if (result.datasetsCreated === 0) pass("No new datasets created (dedup works)");
  else fail(`Expected 0 created, got ${result.datasetsCreated}`);

  if (result.datasetsUpdated === 2) pass("2 datasets updated");
  else fail(`Expected 2 updated, got ${result.datasetsUpdated}`);

  if (result.errors.length === 0) pass("No errors");
  else fail(`Errors: ${result.errors.join(", ")}`);

  // Verify no duplicates
  const datasets = await prisma.dataset.findMany({
    where: { harvestSourceId: sourceId, deletedAt: null },
  });
  if (datasets.length === 2) pass("Still exactly 2 datasets (no duplicates)");
  else fail(`Expected 2 datasets, got ${datasets.length}`);

  // Verify 2 jobs total
  const jobs = await prisma.harvestJob.findMany({ where: { sourceId } });
  if (jobs.length === 2) pass("2 harvest jobs total");
  else fail(`Expected 2 jobs, got ${jobs.length}`);
}

// ─── Step 4: Test error handling (bad URL) ─────────────────────────────────
async function step4_errorHandling(orgId: string) {
  heading("Step 4: Error handling (bad URL)");

  const source = await prisma.harvestSource.create({
    data: {
      name: "Bad Source",
      url: "http://localhost:9999/nonexistent",
      type: "dcat-us",
      organizationId: orgId,
      enabled: true,
    },
  });
  createdSourceIds.push(source.id);

  const { runHarvest } = await import("../src/lib/services/harvest");
  const result = await runHarvest(source.id);

  console.log("  Result:", JSON.stringify(result, null, 2));

  if (result.errors.length > 0) pass(`Error captured: ${result.errors[0]?.substring(0, 80)}`);
  else fail("Expected errors but got none");

  if (result.datasetsCreated === 0) pass("No datasets created");
  else fail(`Expected 0 created, got ${result.datasetsCreated}`);

  // Verify job status
  const job = await prisma.harvestJob.findFirst({
    where: { sourceId: source.id },
    orderBy: { startedAt: "desc" },
  });
  if (job?.status === "error") pass("Job status is 'error'");
  else fail(`Expected job status 'error', got '${job?.status}'`);

  // Verify source status
  const updated = await prisma.harvestSource.findUnique({
    where: { id: source.id },
  });
  if (updated?.lastStatus === "error") pass("Source lastStatus is 'error'");
  else fail(`Expected source lastStatus 'error', got '${updated?.lastStatus}'`);

  if (updated?.lastErrorMsg) pass(`Error message stored: ${updated.lastErrorMsg.substring(0, 80)}`);
  else fail("Expected lastErrorMsg to be set");
}

// ─── Step 5: Source management (disable/delete) ────────────────────────────
async function step5_sourceManagement() {
  heading("Step 5: Source management");

  // Disable a source
  const source = await prisma.harvestSource.findFirst({
    where: { id: createdSourceIds[0] },
  });
  if (!source) {
    fail("No source to test with");
    return;
  }

  await prisma.harvestSource.update({
    where: { id: source.id },
    data: { enabled: false },
  });
  const disabled = await prisma.harvestSource.findUnique({
    where: { id: source.id },
  });
  if (disabled?.enabled === false) pass("Source disabled successfully");
  else fail("Source should be disabled");

  // Re-enable
  await prisma.harvestSource.update({
    where: { id: source.id },
    data: { enabled: true },
  });
  const reenabled = await prisma.harvestSource.findUnique({
    where: { id: source.id },
  });
  if (reenabled?.enabled === true) pass("Source re-enabled successfully");
  else fail("Source should be re-enabled");

  // Delete a source (the bad one) — verify datasets not affected
  const badSourceId = createdSourceIds[1]; // Bad Source
  if (badSourceId) {
    await prisma.harvestJob.deleteMany({ where: { sourceId: badSourceId } });
    await prisma.harvestSource.delete({ where: { id: badSourceId } });

    const deleted = await prisma.harvestSource.findUnique({
      where: { id: badSourceId },
    });
    if (!deleted) pass("Bad source deleted");
    else fail("Bad source should be deleted");

    // Remove from cleanup list
    const idx = createdSourceIds.indexOf(badSourceId);
    if (idx >= 0) createdSourceIds.splice(idx, 1);
  }
}

// ─── Step 6: Discovery endpoint ────────────────────────────────────────────
async function step6_discoveryEndpoint() {
  heading("Step 6: Discovery endpoint (/api/harvest-source.json)");

  const res = await fetch(`${BASE_URL}/api/harvest-source.json`);
  if (res.ok) pass(`Response status: ${res.status}`);
  else {
    fail(`Response status: ${res.status}`);
    return;
  }

  const data = await res.json();

  if (data.name) pass(`name: "${data.name}"`);
  else fail("Missing 'name' field");

  if (data.endpoints?.["dcat-us-1.1"]) {
    const dcatUrl = data.endpoints["dcat-us-1.1"];
    pass(`dcat-us-1.1 endpoint: ${dcatUrl}`);
    // Check if the URL actually works
    const dcatRes = await fetch(dcatUrl).catch(() => null);
    if (dcatRes?.ok) {
      pass("dcat-us-1.1 endpoint is reachable");
    } else {
      fail(`dcat-us-1.1 endpoint NOT reachable (${dcatUrl}) — should be /api/data.json`);
    }
  } else {
    fail("Missing dcat-us-1.1 endpoint");
  }

  if (data.endpoints?.["ckan-api"]?.package_list)
    pass(`CKAN package_list: ${data.endpoints["ckan-api"].package_list}`);
  else fail("Missing CKAN package_list endpoint");

  if (data.conformsTo) pass(`conformsTo: ${data.conformsTo}`);
  else fail("Missing conformsTo");
}

// ─── Step 7: External trigger API ──────────────────────────────────────────
async function step7_externalTriggerAPI() {
  heading("Step 7: External trigger API (/api/admin/harvest/run-scheduled)");

  // Test without API key set (should succeed since HARVEST_API_KEY not in env)
  const res = await fetch(`${BASE_URL}/api/admin/harvest/run-scheduled`, {
    method: "POST",
  });

  console.log(`  Response status: ${res.status}`);
  const body = await res.json();

  if (res.ok) {
    pass("POST succeeded (no API key required when env not set)");
    if (Array.isArray(body.results)) {
      pass(`Got ${body.results.length} results`);
      for (const r of body.results) {
        console.log(
          `    Source: ${r.name} — created: ${r.datasetsCreated ?? "?"}, updated: ${r.datasetsUpdated ?? "?"}, errors: ${r.errors?.length ?? r.error ?? 0}`
        );
      }
    }
  } else {
    fail(`POST failed: ${JSON.stringify(body)}`);
  }
}

// ─── Step 8: Self-harvest test ─────────────────────────────────────────────
async function step8_selfHarvest(orgId: string) {
  heading("Step 8: Self-harvest (DCAT-US from own catalog)");

  // Count existing published datasets
  const preCount = await prisma.dataset.count({
    where: { status: "published", deletedAt: null },
  });
  console.log(`  Published datasets before: ${preCount}`);

  const source = await prisma.harvestSource.create({
    data: {
      name: "Self-Harvest Test",
      url: `${BASE_URL}/api/data.json`,
      type: "dcat-us",
      organizationId: orgId,
      enabled: false, // Don't want external trigger to run this
    },
  });
  createdSourceIds.push(source.id);

  const { runHarvest } = await import("../src/lib/services/harvest");
  const result = await runHarvest(source.id);

  console.log("  Result:", JSON.stringify(result, null, 2));

  // Self-harvest should create datasets (since existing ones don't have harvestSourceId set)
  if (result.datasetsCreated > 0)
    pass(`Created ${result.datasetsCreated} datasets from self-harvest`);
  else fail("Expected some datasets created from self-harvest");

  if (result.errors.length === 0) pass("No errors during self-harvest");
  else {
    console.log(`  ⚠️  ${result.errors.length} errors during self-harvest:`);
    result.errors.slice(0, 5).forEach((e) => console.log(`    - ${e}`));
    if (result.errors.length > 5)
      console.log(`    ... and ${result.errors.length - 5} more`);
  }

  // Track harvested datasets for cleanup
  const harvested = await prisma.dataset.findMany({
    where: { harvestSourceId: source.id },
    select: { id: true },
  });
  for (const d of harvested) createdDatasetIds.push(d.id);

  // Verify re-run deduplication
  const result2 = await runHarvest(source.id);
  if (result2.datasetsCreated === 0)
    pass("Re-run: no duplicates created");
  else fail(`Re-run: expected 0 created, got ${result2.datasetsCreated}`);

  if (result2.datasetsUpdated > 0)
    pass(`Re-run: updated ${result2.datasetsUpdated} datasets`);
}

// ─── Cleanup ───────────────────────────────────────────────────────────────
async function cleanup() {
  heading("Cleanup");

  // Delete harvested datasets (hard delete)
  if (createdDatasetIds.length > 0) {
    // Delete related records first
    for (const id of createdDatasetIds) {
      await prisma.distribution.deleteMany({ where: { datasetId: id } });
      await prisma.datasetCustomFieldValue.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.datasetTheme.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.datasetVersion.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.comment.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.analyticsEvent.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.dataDictionary.deleteMany({ where: { datasetId: id } }).catch(() => {});
      await prisma.savedChart.deleteMany({ where: { datasetId: id } }).catch(() => {});
    }
    const deleted = await prisma.dataset.deleteMany({
      where: { id: { in: createdDatasetIds } },
    });
    pass(`Deleted ${deleted.count} harvested datasets`);
  }

  // Delete harvest sources (cascade deletes jobs)
  for (const id of createdSourceIds) {
    await prisma.harvestJob.deleteMany({ where: { sourceId: id } });
    await prisma.harvestSource.delete({ where: { id } }).catch(() => {});
  }
  pass(`Deleted ${createdSourceIds.length} harvest sources`);

  // Verify clean state
  const remaining = await prisma.harvestSource.findMany({
    where: { id: { in: createdSourceIds } },
  });
  if (remaining.length === 0) pass("All test sources cleaned up");
  else fail(`${remaining.length} sources still remain`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Harvest Feature Validation\n");

  try {
    // Verify dev server is running
    const healthCheck = await fetch(`${BASE_URL}/api/test/fixture-catalog`).catch(
      () => null
    );
    if (!healthCheck?.ok) {
      console.error("❌ Dev server not running at", BASE_URL);
      console.error("   Start with: npm run dev");
      process.exit(1);
    }
    pass("Dev server running");

    const org = await getOrg();
    pass(`Using org: "${org.name}" (${org.id})`);

    await step1_createFixtureSource(org.id);
    await step2_runHarvest(createdSourceIds[0]!);
    await step3_rerunHarvest(createdSourceIds[0]!);
    await step4_errorHandling(org.id);
    await step5_sourceManagement();
    await step6_discoveryEndpoint();
    await step7_externalTriggerAPI();
    await step8_selfHarvest(org.id);
  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("\n✨ Validation complete!\n");
}

main();
