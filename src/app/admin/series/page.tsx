import Link from "next/link";
import { listSeries } from "@/lib/actions/series";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SeriesListPage() {
  const series = await listSeries();

  return (
    <div>
      <AdminPageHeader title="Dataset Series">
        <Button asChild>
          <Link href="/admin/series/new">New Series</Link>
        </Button>
      </AdminPageHeader>

      {series.length === 0 ? (
        <EmptyState
          title="No series created yet"
          description="Create a series to group related datasets together."
          actionLabel="New Series"
          actionHref="/admin/series/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Identifier</TableHead>
              <TableHead>Datasets</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.title}</TableCell>
                <TableCell className="text-text-muted">{s.identifier}</TableCell>
                <TableCell>{(s as any)._count?.datasets ?? 0}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/series/${s.id}`}
                    className="text-primary hover:underline"
                  >
                    Edit
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
