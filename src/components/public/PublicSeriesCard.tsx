import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncateText } from "@/lib/utils/format";

interface PublicSeriesCardProps {
  series: {
    id: string;
    title: string;
    slug: string;
    identifier: string;
    description?: string | null;
    datasetCount: number;
  };
}

export function PublicSeriesCard({ series }: PublicSeriesCardProps) {
  return (
    <Link href={`/series/${series.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full py-4">
        <CardContent className="px-4 py-0 flex flex-col gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {series.title}
          </h3>
          {series.description && (
            <p className="text-xs text-text-muted line-clamp-2">
              {truncateText(series.description, 120)}
            </p>
          )}
          <div className="flex items-center gap-2 mt-auto">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {series.identifier}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {series.datasetCount} dataset{series.datasetCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
