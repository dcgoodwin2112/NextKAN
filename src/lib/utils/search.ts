import { Prisma } from "@/generated/prisma/client";

export interface SearchParams {
  query?: string;
  organizationId?: string;
  keyword?: string;
  format?: string;
  theme?: string;
  accessLevel?: string;
}

export function buildSearchWhere(params: SearchParams | string): Prisma.DatasetWhereInput {
  // Backward compatibility: accept a plain string
  if (typeof params === "string") {
    return buildSearchWhere({ query: params });
  }

  const conditions: Prisma.DatasetWhereInput[] = [];

  if (params.query?.trim()) {
    const terms = params.query.trim().split(/\s+/);
    // Note: SQLite LIKE is case-insensitive for ASCII by default.
    // When migrating to PostgreSQL, add mode: "insensitive" to each contains.
    conditions.push({
      AND: terms.map((term) => ({
        OR: [
          { title: { contains: term } },
          { description: { contains: term } },
          { keywords: { some: { keyword: { contains: term } } } },
        ],
      })),
    });
  }

  if (params.organizationId) {
    conditions.push({ publisherId: params.organizationId });
  }

  if (params.keyword) {
    conditions.push({ keywords: { some: { keyword: params.keyword } } });
  }

  if (params.format) {
    conditions.push({ distributions: { some: { format: params.format } } });
  }

  if (params.theme) {
    conditions.push({ themes: { some: { theme: { slug: params.theme } } } });
  }

  if (params.accessLevel) {
    conditions.push({ accessLevel: params.accessLevel });
  }

  const base: Prisma.DatasetWhereInput = { deletedAt: null };
  if (conditions.length === 0) return base;
  if (conditions.length === 1) return { ...conditions[0], ...base };
  return { AND: conditions, ...base };
}
