import Link from "next/link";

interface OrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parent?: { id: string; name: string; slug: string } | null;
    _count?: { datasets: number };
  };
  adminView?: boolean;
}

export function OrganizationCard({
  organization,
  adminView = false,
}: OrganizationCardProps) {
  const href = adminView
    ? `/admin/organizations/${organization.id}`
    : `/organizations/${organization.slug}`;

  return (
    <div className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
      <Link href={href} className="block">
        <h2 className="font-semibold text-lg">{organization.name}</h2>
        {organization.parent && (
          <p className="text-xs text-text-muted mt-0.5">
            Sub-organization of {organization.parent.name}
          </p>
        )}
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
