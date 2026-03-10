import { getDashboardData } from "@/lib/services/dashboard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardBarChart } from "@/components/admin/DashboardBarChart";
import { DashboardLineChart } from "@/components/admin/DashboardLineChart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CollapsibleSection } from "@/components/admin/CollapsibleSection";
import {
  Database,
  Download,
  Clock,
  BarChart3,
  FileCheck,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  FileX,
  BookOpen,
  Building2,
} from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const { stats, actionItems, catalogHealth, trends, recentActivity } =
    await getDashboardData();

  const hasActionItems =
    actionItems.pendingReview.length > 0 ||
    actionItems.pendingComments !== null ||
    actionItems.failedHarvests.length > 0 ||
    actionItems.lowestQuality.length > 0;

  return (
    <div>
      <AdminPageHeader title="Dashboard" />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><Database className="size-4" /> Published Datasets</div>
            <p className="text-3xl font-bold">{stats.publishedCount}</p>
            {stats.publishedTrend !== 0 && (
              <p className={`text-sm ${stats.publishedTrend > 0 ? "text-success" : "text-danger"}`}>
                {stats.publishedTrend > 0 ? "+" : ""}{stats.publishedTrend} last 30d
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><Download className="size-4" /> Downloads This Month</div>
            <p className="text-3xl font-bold">{stats.downloadsThisMonth}</p>
          </CardContent>
        </Card>
        {stats.pendingReviewCount !== null && (
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-text-muted"><Clock className="size-4" /> Pending Review</div>
              <p className="text-3xl font-bold">{stats.pendingReviewCount}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-text-muted"><BarChart3 className="size-4" /> Avg Quality Score</div>
            <p className="text-3xl font-bold">{stats.avgQualityScore}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Action items row */}
      {hasActionItems && (
        <div className="mt-8">
          <CollapsibleSection title="Action Required">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionItems.pendingReview.length > 0 && (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-medium"><FileCheck className="size-4" /> Pending Review</h3>
                    <Badge variant="secondary">{actionItems.pendingReview.length}</Badge>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.pendingReview.map((d) => (
                      <li key={d.id} className="flex items-center justify-between">
                        <Link href={`/admin/datasets/${d.id}/edit`} className="text-link hover:underline truncate">
                          {d.title}
                        </Link>
                        {d.submittedAt && (
                          <span className="text-text-muted text-xs ml-2 whitespace-nowrap">
                            {new Date(d.submittedAt).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {actionItems.pendingComments && (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-medium"><MessageSquare className="size-4" /> Pending Comments</h3>
                    <Badge variant="secondary">{actionItems.pendingComments.count}</Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    Oldest pending since {new Date(actionItems.pendingComments.oldestDate).toLocaleDateString()}
                  </p>
                  <Link href="/admin/comments" className="text-sm text-link hover:underline mt-2 inline-block">
                    Review comments
                  </Link>
                </CardContent>
              </Card>
            )}

            {actionItems.failedHarvests.length > 0 && (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" /> Failed Harvests</h3>
                    <Badge variant="destructive">{actionItems.failedHarvests.length}</Badge>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.failedHarvests.map((h) => (
                      <li key={h.sourceId} className="flex items-center justify-between">
                        <Link href="/admin/harvest" className="text-link hover:underline truncate">
                          {h.sourceName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {actionItems.lowestQuality.length > 0 && (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-medium"><AlertCircle className="size-4" /> Lowest Quality</h3>
                    <Link href="/admin/quality" className="text-xs text-link hover:underline">View all</Link>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.lowestQuality.map((d) => (
                      <li key={d.id} className="flex items-center justify-between">
                        <Link href={`/admin/datasets/${d.id}/edit`} className="text-link hover:underline truncate">
                          {d.title}
                        </Link>
                        <QualityBadge score={d.score} />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Catalog health row */}
      <div className="mt-8">
        <CollapsibleSection title="Catalog Health">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent>
              <h3 className="flex items-center gap-2 font-medium mb-2"><Clock className="size-4" /> Stale Datasets</h3>
              {catalogHealth.staleDatasets.length === 0 ? (
                <p className="text-sm text-success">All datasets up to date</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{catalogHealth.staleDatasets.length}</p>
                  <ul className="mt-2 space-y-1 text-sm text-text-muted">
                    {catalogHealth.staleDatasets.slice(0, 3).map((d) => (
                      <li key={d.id}>{d.title} ({d.daysSinceUpdate}d)</li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="flex items-center gap-2 font-medium mb-2"><FileX className="size-4" /> No Distributions</h3>
              {catalogHealth.noDistributions.length === 0 ? (
                <p className="text-sm text-success">All datasets have files</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{catalogHealth.noDistributions.length}</p>
                  <ul className="mt-2 space-y-1 text-sm text-text-muted">
                    {catalogHealth.noDistributions.slice(0, 3).map((d) => (
                      <li key={d.id}>{d.title}</li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="flex items-center gap-2 font-medium mb-2"><AlertCircle className="size-4" /> Missing Fields</h3>
              {catalogHealth.missingFields.length === 0 ? (
                <p className="text-sm text-success">All fields complete</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {catalogHealth.missingFields.slice(0, 5).map((f) => (
                    <li key={f.field} className="flex justify-between">
                      <span>{f.field}</span>
                      <span className="text-text-muted">{f.count} missing</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="flex items-center gap-2 font-medium mb-2"><BookOpen className="size-4" /> Dictionary Coverage</h3>
              <p className="text-2xl font-bold">{catalogHealth.dictionaryCoverage.percent}%</p>
              <p className="text-sm text-text-muted">
                {catalogHealth.dictionaryCoverage.withDictionary} of {catalogHealth.dictionaryCoverage.total} distributions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="flex items-center gap-2 font-medium mb-2"><Building2 className="size-4" /> Empty Organizations</h3>
              {catalogHealth.emptyOrgs.length === 0 ? (
                <p className="text-sm text-success">All orgs have published data</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{catalogHealth.emptyOrgs.length}</p>
                  <ul className="mt-2 space-y-1 text-sm text-text-muted">
                    {catalogHealth.emptyOrgs.slice(0, 3).map((o) => (
                      <li key={o.id}>{o.name}</li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        </CollapsibleSection>
      </div>

      {/* Trends row */}
      <div className="mt-8">
        <CollapsibleSection title="Trends">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent>
              <h3 className="font-medium mb-3">Publishing Rate</h3>
              <DashboardBarChart data={trends.publishingRate} />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h3 className="font-medium mb-3">Views & Downloads (90d)</h3>
              <DashboardLineChart data={trends.viewsAndDownloads} />
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {trends.mostViewed.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="font-medium mb-3">Most Viewed</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trends.mostViewed.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Link href={`/admin/datasets/${d.id}/edit`} className="text-link hover:underline">
                            {d.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{d.views}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {trends.mostDownloaded.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="font-medium mb-3">Most Downloaded</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dataset</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trends.mostDownloaded.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Link href={`/admin/datasets/${d.id}/edit`} className="text-link hover:underline">
                            {d.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right font-mono">{d.downloads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
        </CollapsibleSection>
      </div>

      {/* Recent activity row */}
      <div className="mt-8">
        <CollapsibleSection title="Recent Activity">
          <Card>
            <CardContent>
              <ActivityFeed activities={recentActivity as any} />
            </CardContent>
          </Card>
        </CollapsibleSection>
      </div>
    </div>
  );
}
