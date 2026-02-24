import Link from "next/link";

interface OrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    _count?: { datasets: number };
  };
  adminView?: boolean;
}

export function OrganizationCard({
  organization,
  adminView = false,
}: OrganizationCardProps) {
  const href = adminView
    ? `/admin/organizations/${organization.id}/edit`
    : `/organizations/${organization.slug}`;

  return (
    <div className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
      <Link href={href} className="block">
        <h3 className="font-semibold text-lg">{organization.name}</h3>
        {organization.description && (
          <p className="text-sm text-text-tertiary mt-1">
            {organization.description}
          </p>
        )}
        {organization._count && (
          <p className="text-xs text-text-muted mt-2">
            {organization._count.datasets} dataset
            {organization._count.datasets !== 1 ? "s" : ""}
          </p>
        )}
      </Link>
    </div>
  );
}
