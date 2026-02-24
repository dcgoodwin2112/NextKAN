import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/services/analytics";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function AnalyticsDashboardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") {
    redirect("/login");
  }

  const params = await searchParams;
  const period = params.period || "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const summary = await getAnalyticsSummary(startDate, endDate);

  const periods = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          {periods.map((p) => (
            <Link
              key={p.value}
              href={`/admin/analytics?period=${p.value}`}
              className={`px-3 py-1 rounded text-sm ${
                period === p.value
                  ? "bg-primary text-white"
                  : "bg-surface-alt text-text-secondary hover:bg-surface-inset"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Total Views</p>
          <p className="text-2xl font-bold">{summary.totalViews.toLocaleString()}</p>
        </div>
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Downloads</p>
          <p className="text-2xl font-bold">{summary.totalDownloads.toLocaleString()}</p>
        </div>
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">API Calls</p>
          <p className="text-2xl font-bold">{summary.totalApiCalls.toLocaleString()}</p>
        </div>
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Unique Visitors</p>
          <p className="text-2xl font-bold">{summary.uniqueVisitors.toLocaleString()}</p>
        </div>
      </div>

      {/* Top Datasets */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Top Datasets</h2>
        {summary.topDatasets.length === 0 ? (
          <p className="text-text-muted text-sm">No dataset activity in this period.</p>
        ) : (
          <div className="rounded border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">Dataset</th>
                  <th className="text-right px-4 py-3 font-medium">Views</th>
                  <th className="text-right px-4 py-3 font-medium">Downloads</th>
                </tr>
              </thead>
              <tbody>
                {summary.topDatasets.map((ds, i) => (
                  <tr key={ds.entityId} className="border-b last:border-0">
                    <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                    <td className="px-4 py-3">{ds.title}</td>
                    <td className="px-4 py-3 text-right font-mono">{ds.views.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono">{ds.downloads.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Search Terms */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Top Search Terms</h2>
        {summary.topSearchTerms.length === 0 ? (
          <p className="text-text-muted text-sm">No search activity in this period.</p>
        ) : (
          <div className="rounded border bg-background overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">Term</th>
                  <th className="text-right px-4 py-3 font-medium">Searches</th>
                </tr>
              </thead>
              <tbody>
                {summary.topSearchTerms.map((st, i) => (
                  <tr key={st.term} className="border-b last:border-0">
                    <td className="px-4 py-3 text-text-muted">{i + 1}</td>
                    <td className="px-4 py-3">{st.term}</td>
                    <td className="px-4 py-3 text-right font-mono">{st.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
