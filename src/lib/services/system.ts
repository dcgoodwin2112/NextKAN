import { prisma } from "@/lib/db";
import { isWorkflowEnabled } from "@/lib/services/workflow";
import { isCommentsEnabled } from "@/lib/services/comments";
import { isPluginsEnabled } from "@/lib/plugins/loader";

export interface SystemInfo {
  node: string;
  nextVersion: string;
  prismaVersion: string;
  databaseType: "sqlite" | "postgresql";
  storageProvider: string;
  counts: {
    datasets: number;
    organizations: number;
    users: number;
    distributions: number;
  };
  features: {
    workflow: boolean;
    comments: boolean;
    plugins: boolean;
  };
  lastHarvestTime: Date | null;
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const pkg = await import("../../../package.json");

  const dbUrl = process.env.DATABASE_URL ?? "";
  const databaseType = dbUrl.startsWith("postgresql") ? "postgresql" : "sqlite";

  const storageProvider = process.env.STORAGE_PROVIDER ?? "local";

  const [datasets, organizations, users, distributions, lastJob] =
    await Promise.all([
      prisma.dataset.count({ where: { deletedAt: null } }),
      prisma.organization.count(),
      prisma.user.count(),
      prisma.distribution.count(),
      prisma.harvestJob
        .findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } })
        .catch(() => null),
    ]);

  return {
    node: process.version,
    nextVersion: pkg.dependencies?.next ?? "unknown",
    prismaVersion: pkg.dependencies?.prisma ?? "unknown",
    databaseType,
    storageProvider,
    counts: { datasets, organizations, users, distributions },
    features: {
      workflow: isWorkflowEnabled(),
      comments: isCommentsEnabled(),
      plugins: isPluginsEnabled(),
    },
    lastHarvestTime: lastJob?.startedAt ?? null,
  };
}
