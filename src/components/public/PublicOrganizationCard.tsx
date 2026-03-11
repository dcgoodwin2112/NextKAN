import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncateText } from "@/lib/utils/format";

interface PublicOrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parentId?: string | null;
    _count?: { datasets: number };
  };
}

export function PublicOrganizationCard({ organization }: PublicOrganizationCardProps) {
  const truncated = organization.description
    ? truncateText(organization.description, 120)
    : null;

  const datasetCount = organization._count?.datasets ?? 0;

  return (
    <Link href={`/organizations/${organization.slug}`}>
      <Card className="hover:shadow-md transition-shadow h-full py-4">
        <CardContent className="px-4 py-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted shrink-0" />
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {organization.name}
            </h3>
          </div>
          {truncated && (
            <p className="text-xs text-text-muted line-clamp-2">{truncated}</p>
          )}
          <div className="flex items-center gap-2 mt-auto">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {datasetCount} dataset{datasetCount !== 1 ? "s" : ""}
            </Badge>
            {organization.parentId && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Sub-organization
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
