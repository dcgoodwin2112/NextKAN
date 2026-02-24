import { prisma } from "@/lib/db";
import {
  reverseDCATUSToDatasetInput,
  type DCATUSCatalog,
  type DCATUSDataset,
} from "@/lib/schemas/dcat-us";
import { createDataset, updateDataset, addDistribution } from "@/lib/actions/datasets";

export interface HarvestResult {
  datasetsCreated: number;
  datasetsUpdated: number;
  datasetsDeleted: number;
  errors: string[];
}

/** Fetch and parse a DCAT-US catalog from a URL. */
async function fetchDCATUSCatalog(url: string): Promise<DCATUSCatalog> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** Fetch datasets from a CKAN API. */
async function fetchCKANDatasets(
  baseUrl: string
): Promise<DCATUSDataset[]> {
  const listUrl = `${baseUrl.replace(/\/$/, "")}/api/3/action/package_list`;
  const listRes = await fetch(listUrl, { signal: AbortSignal.timeout(30000) });
  if (!listRes.ok) throw new Error(`CKAN list failed: ${listRes.status}`);
  const listData = await listRes.json();
  const packageNames: string[] = listData.result || [];

  const datasets: DCATUSDataset[] = [];
  for (const name of packageNames) {
    try {
      const showUrl = `${baseUrl.replace(/\/$/, "")}/api/3/action/package_show?id=${encodeURIComponent(name)}`;
      const showRes = await fetch(showUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (!showRes.ok) continue;
      const showData = await showRes.json();
      const pkg = showData.result;

      // Map CKAN fields to DCAT-US format
      datasets.push({
        "@type": "dcat:Dataset",
        title: pkg.title || pkg.name,
        description: pkg.notes || "",
        keyword: (pkg.tags || []).map((t: { name: string }) => t.name),
        modified: pkg.metadata_modified || new Date().toISOString(),
        publisher: {
          "@type": "org:Organization",
          name: pkg.organization?.title || "Unknown",
        },
        contactPoint: {
          "@type": "vcard:Contact",
          fn: pkg.maintainer || pkg.author || "",
          hasEmail: pkg.maintainer_email
            ? `mailto:${pkg.maintainer_email}`
            : pkg.author_email
              ? `mailto:${pkg.author_email}`
              : "",
        },
        identifier: pkg.id || pkg.name,
        accessLevel: pkg.private ? "non-public" : "public",
        license: pkg.license_url || undefined,
        distribution: (pkg.resources || []).map(
          (r: {
            name?: string;
            description?: string;
            url?: string;
            format?: string;
            mimetype?: string;
          }) => ({
            "@type": "dcat:Distribution",
            title: r.name || undefined,
            description: r.description || undefined,
            downloadURL: r.url || undefined,
            format: r.format || undefined,
            mediaType: r.mimetype || undefined,
          })
        ),
      });
    } catch {
      // Skip individual package errors
    }
  }

  return datasets;
}

/** Run a harvest for a given source. */
export async function runHarvest(sourceId: string): Promise<HarvestResult> {
  const source = await prisma.harvestSource.findUniqueOrThrow({
    where: { id: sourceId },
  });

  const job = await prisma.harvestJob.create({
    data: { sourceId, status: "running" },
  });

  const result: HarvestResult = {
    datasetsCreated: 0,
    datasetsUpdated: 0,
    datasetsDeleted: 0,
    errors: [],
  };

  try {
    let remoteDatasets: DCATUSDataset[];

    if (source.type === "ckan") {
      remoteDatasets = await fetchCKANDatasets(source.url);
    } else {
      const catalog = await fetchDCATUSCatalog(source.url);
      remoteDatasets = catalog.dataset || [];
    }

    const remoteIdentifiers = new Set<string>();

    for (const remote of remoteDatasets) {
      const identifier = remote.identifier;
      if (!identifier) continue;
      remoteIdentifiers.add(identifier);

      try {
        // Check for existing harvested dataset
        const existing = await prisma.dataset.findFirst({
          where: {
            harvestSourceId: sourceId,
            harvestIdentifier: identifier,
          },
        });

        if (existing) {
          // Update if remote is newer
          const mapped = reverseDCATUSToDatasetInput(
            remote,
            source.organizationId
          );
          const { distributions, ...datasetInput } = mapped;
          await updateDataset(existing.id, {
            ...datasetInput,
            keywords: datasetInput.keywords?.length
              ? datasetInput.keywords
              : ["untagged"],
          });
          result.datasetsUpdated++;
        } else {
          // Create new dataset
          const mapped = reverseDCATUSToDatasetInput(
            remote,
            source.organizationId
          );
          const { distributions, ...datasetInput } = mapped;

          if (!datasetInput.keywords || datasetInput.keywords.length === 0) {
            datasetInput.keywords = ["untagged"];
          }

          const dataset = await createDataset(datasetInput);

          // Set harvest tracking fields
          await prisma.dataset.update({
            where: { id: dataset.id },
            data: {
              harvestSourceId: sourceId,
              harvestIdentifier: identifier,
            },
          });

          // Create distributions (remote URLs, don't download)
          if (distributions) {
            for (const dist of distributions) {
              if (dist.downloadURL || dist.accessURL) {
                await addDistribution(dataset.id, dist);
              }
            }
          }

          result.datasetsCreated++;
        }
      } catch (error) {
        result.errors.push(
          `${identifier}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Archive local datasets not in remote
    const localDatasets = await prisma.dataset.findMany({
      where: {
        harvestSourceId: sourceId,
        status: { not: "archived" },
      },
      select: { id: true, harvestIdentifier: true },
    });

    for (const local of localDatasets) {
      if (local.harvestIdentifier && !remoteIdentifiers.has(local.harvestIdentifier)) {
        await prisma.dataset.update({
          where: { id: local.id },
          data: { status: "archived" },
        });
        result.datasetsDeleted++;
      }
    }

    // Update job and source
    const status =
      result.errors.length > 0
        ? result.datasetsCreated > 0 || result.datasetsUpdated > 0
          ? "partial"
          : "error"
        : "success";

    await prisma.harvestJob.update({
      where: { id: job.id },
      data: {
        status: status === "partial" || status === "error" ? "error" : "success",
        datasetsCreated: result.datasetsCreated,
        datasetsUpdated: result.datasetsUpdated,
        datasetsDeleted: result.datasetsDeleted,
        errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        completedAt: new Date(),
      },
    });

    await prisma.harvestSource.update({
      where: { id: sourceId },
      data: {
        lastHarvestAt: new Date(),
        lastStatus: status,
        lastErrorMsg: result.errors.length > 0 ? result.errors[0] : null,
        datasetCount: result.datasetsCreated + result.datasetsUpdated,
      },
    });

    // Fire-and-forget email
    try {
      const { getEmailService } = await import("@/lib/services/email");
      const { harvestCompleteEmail } = await import(
        "@/lib/email-templates/harvest-complete"
      );
      const email = harvestCompleteEmail({
        sourceName: source.name,
        status,
        created: result.datasetsCreated,
        updated: result.datasetsUpdated,
        deleted: result.datasetsDeleted,
        errors: result.errors.length,
      });
      getEmailService()
        .send({ to: "admin@example.com", ...email })
        .catch(() => {});
    } catch {
      // Non-fatal
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Harvest failed";

    await prisma.harvestJob.update({
      where: { id: job.id },
      data: {
        status: "error",
        errors: JSON.stringify([message]),
        completedAt: new Date(),
      },
    });

    await prisma.harvestSource.update({
      where: { id: sourceId },
      data: {
        lastHarvestAt: new Date(),
        lastStatus: "error",
        lastErrorMsg: message,
      },
    });

    result.errors.push(message);
  }

  return result;
}
