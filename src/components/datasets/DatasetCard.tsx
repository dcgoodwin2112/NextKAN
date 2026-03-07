import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

const statusStyles: Record<string, string> = {
  draft: "bg-warning-subtle text-warning-text",
  published: "bg-success-subtle text-success-text",
  archived: "bg-surface-alt text-text-tertiary",
};

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

  return (
    <div
      className={`relative rounded-lg border p-4 hover:shadow-sm transition-shadow ${
        selected ? "border-primary bg-primary-subtle/30" : "border-border"
      }`}
    >
      {selectable && (
        <div
          className="absolute top-3 right-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected ?? false}
            onCheckedChange={() => onToggle?.(dataset.id)}
            aria-label={`Select ${dataset.title}`}
          />
        </div>
      )}
      <Link href={href} className="block">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{dataset.title}</h3>
          {adminView && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[dataset.status] || "bg-surface-alt text-text-tertiary"}`}
            >
              {dataset.status}
            </span>
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
      </Link>
    </div>
  );
}
