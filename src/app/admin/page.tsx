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
            <p className="text-sm text-text-muted">Published Datasets</p>
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
            <p className="text-sm text-text-muted">Downloads This Month</p>
            <p className="text-3xl font-bold">{stats.downloadsThisMonth}</p>
          </CardContent>
        </Card>
        {stats.pendingReviewCount !== null && (
          <Card>
            <CardContent>
              <p className="text-sm text-text-muted">Pending Review</p>
              <p className="text-3xl font-bold">{stats.pendingReviewCount}</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Avg Quality Score</p>
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
                    <h3 className="font-medium">Pending Review</h3>
                    <Badge variant="secondary">{actionItems.pendingReview.length}</Badge>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.pendingReview.map((d) => (
                      <li key={d.id} className="flex items-center justify-between">
                        <Link href={`/admin/datasets/${d.id}/edit`} className="text-primary hover:underline truncate">
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
                    <h3 className="font-medium">Pending Comments</h3>
                    <Badge variant="secondary">{actionItems.pendingComments.count}</Badge>
                  </div>
                  <p className="text-sm text-text-muted">
                    Oldest pending since {new Date(actionItems.pendingComments.oldestDate).toLocaleDateString()}
                  </p>
                  <Link href="/admin/comments" className="text-sm text-primary hover:underline mt-2 inline-block">
                    Review comments
                  </Link>
                </CardContent>
              </Card>
            )}

            {actionItems.failedHarvests.length > 0 && (
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Failed Harvests</h3>
                    <Badge variant="destructive">{actionItems.failedHarvests.length}</Badge>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.failedHarvests.map((h) => (
                      <li key={h.sourceId} className="flex items-center justify-between">
                        <Link href="/admin/harvest" className="text-primary hover:underline truncate">
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
                    <h3 className="font-medium">Lowest Quality</h3>
                    <Link href="/admin/quality" className="text-xs text-primary hover:underline">View all</Link>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {actionItems.lowestQuality.map((d) => (
                      <li key={d.id} className="flex items-center justify-between">
                        <Link href={`/admin/datasets/${d.id}/edit`} className="text-primary hover:underline truncate">
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
              <h3 className="font-medium mb-2">Stale Datasets</h3>
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
              <h3 className="font-medium mb-2">No Distributions</h3>
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
              <h3 className="font-medium mb-2">Missing Fields</h3>
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
              <h3 className="font-medium mb-2">Dictionary Coverage</h3>
              <p className="text-2xl font-bold">{catalogHealth.dictionaryCoverage.percent}%</p>
              <p className="text-sm text-text-muted">
                {catalogHealth.dictionaryCoverage.withDictionary} of {catalogHealth.dictionaryCoverage.total} distributions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="font-medium mb-2">Empty Organizations</h3>
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
                          <Link href={`/admin/datasets/${d.id}/edit`} className="text-primary hover:underline">
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
                          <Link href={`/admin/datasets/${d.id}/edit`} className="text-primary hover:underline">
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
