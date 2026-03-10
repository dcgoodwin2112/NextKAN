import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface DatasetCardProps {
  dataset: {
    id: string;
    title: string;
    slug: string;
    description: string;
    status: string;
    modified: Date;
    publisher: { name: string };
    keywords: { keyword: string }[];
    distributions: { format?: string | null }[];
  };
  adminView?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}

export function DatasetCard({
  dataset,
  adminView = false,
  selectable,
  selected,
  onToggle,
}: DatasetCardProps) {
  const href = adminView
    ? `/admin/datasets/${dataset.id}/edit`
    : `/datasets/${dataset.slug}`;

  const truncated =
    dataset.description.length > 150
      ? dataset.description.slice(0, 150) + "..."
      : dataset.description;

  const formats = [
    ...new Set(
      dataset.distributions
        .map((d) => d.format)
        .filter(Boolean) as string[]
    ),
  ];

  const cardContent = (
    <>
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-lg">{dataset.title}</h2>
        {adminView && (
          <StatusBadge status={dataset.status} />
        )}
      </div>
      <p className="text-sm text-text-tertiary mt-1">{truncated}</p>
      <p className="text-xs text-text-muted mt-1">{dataset.publisher.name}</p>
      {dataset.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {dataset.keywords.map((k) => (
            <span
              key={k.keyword}
              className="rounded bg-surface-alt px-2 py-0.5 text-xs text-text-tertiary"
            >
              {k.keyword}
            </span>
          ))}
        </div>
      )}
      {formats.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {formats.map((f) => (
            <span
              key={f}
              className="rounded bg-primary-subtle px-2 py-0.5 text-xs text-primary-subtle-text"
            >
              {f}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-text-muted mt-2">
        Modified: {new Date(dataset.modified).toLocaleDateString()}
      </p>
    </>
  );

  if (selectable) {
    return (
      <div
        className={`flex rounded-lg border overflow-hidden hover:shadow-sm transition-shadow ${
          selected ? "border-primary bg-primary-subtle/30" : "border-border"
        }`}
      >
        <label
          className={`w-8 shrink-0 flex items-center justify-center border-r cursor-pointer ${
            selected
              ? "border-primary/30 bg-primary-subtle/50"
              : "border-border"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={() => onToggle?.(dataset.id)}
            aria-label={`Select ${dataset.title}`}
          />
        </label>
        <Link href={href} className="block flex-1 min-w-0 p-4">
          {cardContent}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 hover:shadow-sm transition-shadow">
      <Link href={href} className="block">
        {cardContent}
      </Link>
    </div>
  );
}
