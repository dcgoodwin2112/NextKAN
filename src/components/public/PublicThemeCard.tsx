import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicThemeCardProps {
  theme: {
    id: string;
    name: string;
    slug: string;
    color?: string | null;
    description?: string | null;
    datasetCount: number;
  };
}

export function PublicThemeCard({ theme }: PublicThemeCardProps) {
  return (
    <Link href={`/datasets?theme=${theme.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full py-4">
        <CardContent className="px-4 py-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: theme.color || "#3b82f6" }}
            />
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {theme.name}
            </h3>
          </div>
          {theme.description && (
            <p className="text-xs text-text-muted line-clamp-2">{theme.description}</p>
          )}
          <div className="mt-auto">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {theme.datasetCount} dataset{theme.datasetCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
