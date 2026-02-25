import Link from "next/link";
import { listSeries } from "@/lib/actions/series";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Identifier</th>
              <th className="pb-2 font-medium">Datasets</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2">{s.title}</td>
                <td className="py-2 text-text-muted">{s.identifier}</td>
                <td className="py-2">{(s as any)._count?.datasets ?? 0}</td>
                <td className="py-2">
                  <Link
                    href={`/admin/series/${s.id}`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
