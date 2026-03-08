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

function resolveUrl(url: string): string {
  // Relative URLs (e.g. /uploads/file.csv) need a base
  if (url.startsWith("/")) {
    const base = process.env.SITE_URL || "http://localhost:3000";
    return `${base}${url}`;
  }
  return url;
}

async function checkUrl(
  distributionId: string,
  rawUrl: string,
  datasetTitle: string,
  distributionTitle: string
): Promise<LinkCheckResult> {
  const url = resolveUrl(rawUrl);

  // Skip URLs that can't be fetched
  try {
    new URL(url);
  } catch {
    return {
      distributionId,
      url: rawUrl,
      status: "error",
      ok: false,
      error: "Invalid URL",
      datasetTitle,
      distributionTitle,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // Try HEAD first, fall back to GET if HEAD is rejected (405/403)
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    if (res.status === 405 || res.status === 403) {
      clearTimeout(timeout);
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 10_000);
      try {
        res = await fetch(url, {
          method: "GET",
          signal: controller2.signal,
          redirect: "follow",
          headers: { Range: "bytes=0-0" },
        });
      } finally {
        clearTimeout(timeout2);
      }
    }

    return {
      distributionId,
      url: rawUrl,
      status: res.status,
      ok: res.ok || res.status === 206,
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
      url: rawUrl,
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
