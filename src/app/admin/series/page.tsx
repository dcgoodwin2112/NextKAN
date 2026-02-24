import Link from "next/link";
import { listSeries } from "@/lib/actions/series";

export default async function SeriesListPage() {
  const series = await listSeries();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dataset Series</h1>
        <Link
          href="/admin/series/new"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          New Series
        </Link>
      </div>

      {series.length === 0 ? (
        <p className="text-text-muted">No series created yet.</p>
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
