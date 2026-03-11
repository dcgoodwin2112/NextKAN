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
      <h1 className="text-2xl md:text-3xl font-bold mb-3">{title}</h1>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/datasets?org=${publisher.id}`}
          className="text-primary hover:underline"
        >
          {publisher.name}
        </Link>
        {series && (
          <Link href={`/series/${series.slug}`}>
            <Badge variant="secondary" className="text-xs">
              Series: {series.title}
            </Badge>
          </Link>
        )}
        {accessLevel && (
          <Badge variant="outline" className="text-xs capitalize">
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
