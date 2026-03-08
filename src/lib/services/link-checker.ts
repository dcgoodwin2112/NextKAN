import { prisma } from "@/lib/db";

export interface LinkCheckResult {
  distributionId: string;
  url: string;
  status: number | "error";
  ok: boolean;
  error?: string;
  datasetTitle: string;
  distributionTitle: string;
}

/** HEAD-request each distribution URL with a 10s timeout. */
export async function checkDistributionLinks(
  distributionIds?: string[]
): Promise<LinkCheckResult[]> {
  const where: Record<string, unknown> = {
    OR: [
      { downloadURL: { not: null } },
      { accessURL: { not: null } },
    ],
  };
  if (distributionIds?.length) {
    where.id = { in: distributionIds };
  }

  const distributions = await prisma.distribution.findMany({
    where,
    select: {
      id: true,
      title: true,
      downloadURL: true,
      accessURL: true,
      dataset: { select: { title: true, deletedAt: true } },
    },
  });

  // Exclude distributions belonging to soft-deleted datasets
  const active = distributions.filter((d) => d.dataset.deletedAt === null);

  const results: LinkCheckResult[] = [];

  for (const dist of active) {
    const urls: string[] = [];
    if (dist.downloadURL) urls.push(dist.downloadURL);
    if (dist.accessURL && dist.accessURL !== dist.downloadURL) {
      urls.push(dist.accessURL);
    }

    for (const url of urls) {
      results.push(await checkUrl(dist.id, url, dist.dataset.title, dist.title ?? "Untitled"));
    }
  }

  return results;
}

async function checkUrl(
  distributionId: string,
  url: string,
  datasetTitle: string,
  distributionTitle: string
): Promise<LinkCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return {
      distributionId,
      url,
      status: res.status,
      ok: res.ok,
      datasetTitle,
      distributionTitle,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out (10s)"
          : err.message
        : "Unknown error";
    return {
      distributionId,
      url,
      status: "error",
      ok: false,
      error: message,
      datasetTitle,
      distributionTitle,
    };
  } finally {
    clearTimeout(timeout);
  }
}
