import Link from "next/link";
import { listHarvestSources } from "@/lib/actions/harvest";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminHarvestPage() {
  const sources = await listHarvestSources();

  return (
    <div>
      <AdminPageHeader title="Harvest Sources">
        <Button asChild size="sm">
          <Link href="/admin/harvest/new">New Source</Link>
        </Button>
      </AdminPageHeader>

      {sources.length === 0 ? (
        <EmptyState
          title="No harvest sources configured"
          description="Create one to start harvesting datasets from external catalogs."
          actionLabel="New Source"
          actionHref="/admin/harvest/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Datasets</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.name}</TableCell>
                <TableCell className="text-text-muted">{source.type}</TableCell>
                <TableCell>
                  {source.lastStatus && (
                    <Badge
                      variant={
                        source.lastStatus === "success"
                          ? "default"
                          : source.lastStatus === "partial"
                            ? "secondary"
                            : "destructive"
                      }
                      className={
                        source.lastStatus === "success"
                          ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                          : source.lastStatus === "partial"
                            ? "bg-warning-subtle text-warning-text hover:bg-warning-subtle"
                            : ""
                      }
                    >
                      {source.lastStatus}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{source.datasetCount}</TableCell>
                <TableCell className="text-text-muted">
                  {source.lastHarvestAt
                    ? new Date(source.lastHarvestAt).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={source.enabled ? "default" : "secondary"}
                    className={
                      source.enabled
                        ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                        : "bg-surface-alt text-text-muted hover:bg-surface-alt"
                    }
                  >
                    {source.enabled ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/harvest/${source.id}`}
                    className="text-primary hover:underline"
                  >
                    Manage
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
