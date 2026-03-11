import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PublicBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function PublicBreadcrumbs({ items }: PublicBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-base text-text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="mx-1">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="hover:text-primary hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
