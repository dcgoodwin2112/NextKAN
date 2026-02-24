import Link from "next/link";

const statusStyles: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
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
}

export function DatasetCard({ dataset, adminView = false }: DatasetCardProps) {
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
    <div className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <Link href={href} className="block">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">{dataset.title}</h3>
          {adminView && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[dataset.status] || "bg-gray-100 text-gray-600"}`}
            >
              {dataset.status}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{truncated}</p>
        <p className="text-xs text-gray-500 mt-1">{dataset.publisher.name}</p>
        {dataset.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {dataset.keywords.map((k) => (
              <span
                key={k.keyword}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
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
                className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
              >
                {f}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Modified: {new Date(dataset.modified).toLocaleDateString()}
        </p>
      </Link>
    </div>
  );
}
