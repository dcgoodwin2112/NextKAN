import type {
  Dataset,
  Distribution,
  Organization,
  DatasetKeyword,
  User,
} from "@/generated/prisma/client";

export type DatasetWithRelations = Dataset & {
  publisher: Organization & { parent: Organization | null };
  distributions: Distribution[];
  keywords: DatasetKeyword[];
};

export type OrganizationWithRelations = Organization & {
  parent: Organization | null;
  children: Organization[];
  datasets: Dataset[];
  _count?: { datasets: number };
};

export type { Dataset, Distribution, Organization, DatasetKeyword, User };
