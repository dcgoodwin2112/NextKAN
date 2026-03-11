import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

interface DatasetHeaderProps {
  title: string;
  publisher: { name: string; id: string };
  series?: { title: string; slug: string } | null;
  accessLevel?: string;
  modified: Date;
}

export function DatasetHeader({
  title,
  publisher,
  series,
  accessLevel,
  modified,
}: DatasetHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
      <div className="flex flex-wrap items-center gap-2 text-base">
        <Link
          href={`/datasets?org=${publisher.id}`}
          className="text-primary hover:underline"
        >
          {publisher.name}
        </Link>
        {series && (
          <Link href={`/series/${series.slug}`}>
            <Badge variant="secondary" className="text-sm">
              Series: {series.title}
            </Badge>
          </Link>
        )}
        {accessLevel && (
          <Badge variant="outline" className="text-sm capitalize">
            {accessLevel}
          </Badge>
        )}
        <span className="text-text-muted">
          Updated {formatDate(modified)}
        </span>
      </div>
    </div>
  );
}
