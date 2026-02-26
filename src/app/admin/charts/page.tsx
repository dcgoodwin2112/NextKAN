import Link from "next/link";
import { listCharts } from "@/lib/actions/charts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartDeleteButton } from "./ChartDeleteButton";

export default async function AdminChartsPage() {
  const charts = await listCharts();

  return (
    <div>
      <AdminPageHeader title="Charts">
        <Button asChild>
          <Link href="/admin/charts/new">New Chart</Link>
        </Button>
      </AdminPageHeader>

      {charts.length === 0 ? (
        <EmptyState
          title="No charts yet"
          description="Create a chart from a distribution with datastore data."
          actionLabel="New Chart"
          actionHref="/admin/charts/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Dataset</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charts.map((chart) => (
              <TableRow key={chart.id}>
                <TableCell className="font-medium">
                  {chart.title || "Untitled"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {chart.distribution.dataset.title}
                  <span className="ml-1 text-xs text-text-tertiary">
                    ({chart.distribution.dataset.publisher.name})
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{chart.chartType}</Badge>
                </TableCell>
                <TableCell className="text-text-muted">
                  {new Date(chart.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/charts/${chart.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <ChartDeleteButton chartId={chart.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
