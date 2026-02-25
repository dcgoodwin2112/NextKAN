import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/services/analytics";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <AdminPageHeader title="Analytics Dashboard">
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
      </AdminPageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Total Views</p>
            <p className="text-2xl font-bold">{summary.totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Downloads</p>
            <p className="text-2xl font-bold">{summary.totalDownloads.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">API Calls</p>
            <p className="text-2xl font-bold">{summary.totalApiCalls.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Unique Visitors</p>
            <p className="text-2xl font-bold">{summary.uniqueVisitors.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Datasets */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Top Datasets</h2>
        {summary.topDatasets.length === 0 ? (
          <p className="text-text-muted text-sm">No dataset activity in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.topDatasets.map((ds, i) => (
                <TableRow key={ds.entityId}>
                  <TableCell className="text-text-muted">{i + 1}</TableCell>
                  <TableCell>{ds.title}</TableCell>
                  <TableCell className="text-right font-mono">{ds.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{ds.downloads.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Top Search Terms */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Top Search Terms</h2>
        {summary.topSearchTerms.length === 0 ? (
          <p className="text-text-muted text-sm">No search activity in this period.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Searches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.topSearchTerms.map((st, i) => (
                <TableRow key={st.term}>
                  <TableCell className="text-text-muted">{i + 1}</TableCell>
                  <TableCell>{st.term}</TableCell>
                  <TableCell className="text-right font-mono">{st.count.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
