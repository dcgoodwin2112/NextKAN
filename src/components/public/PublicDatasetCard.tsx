import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicDatasetCardProps {
  dataset: {
    id: string;
    title: string;
    slug: string;
    description: string;
    modified: Date;
    publisher: { name: string };
    distributions: { format?: string | null }[];
    keywords: { keyword: string }[];
  };
}

export function PublicDatasetCard({ dataset }: PublicDatasetCardProps) {
  const truncated =
    dataset.description.length > 120
      ? dataset.description.slice(0, 120) + "..."
      : dataset.description;

  const formats = [
    ...new Set(
      dataset.distributions
        .map((d) => d.format)
        .filter(Boolean) as string[]
    ),
  ];

  return (
    <Link href={`/datasets/${dataset.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full py-4">
        <CardContent className="px-4 py-0 flex flex-col gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {dataset.title}
          </h3>
          <p className="text-xs text-text-muted line-clamp-2">{truncated}</p>
          <p className="text-xs text-text-muted">{dataset.publisher.name}</p>
          {formats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {formats.slice(0, 3).map((f) => (
                <Badge
                  key={f}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {f}
                </Badge>
              ))}
              {formats.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{formats.length - 3}
                </Badge>
              )}
            </div>
          )}
          <p className="text-[10px] text-text-muted mt-auto">
            Updated {new Date(dataset.modified).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
