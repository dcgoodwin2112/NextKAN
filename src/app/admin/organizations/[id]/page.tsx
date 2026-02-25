import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrgPermission, PermissionError } from "@/lib/auth/check-permission";
import { getOrgDashboardData } from "@/lib/services/org-dashboard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { EmptyState } from "@/components/admin/EmptyState";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

export default async function OrgDashboardPage({ params }: Props) {
  const { id } = await params;

  try {
    await requireOrgPermission("org:view", id);
  } catch (e) {
    if (e instanceof PermissionError) redirect("/login");
    throw e;
  }

  const data = await getOrgDashboardData(id);
  if (!data) notFound();

  const { organization, members, datasetCounts, topDatasets, avgQualityScore, recentActivity } = data;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Organizations", href: "/admin/organizations" },
          { label: organization.name },
        ]}
      />
      <AdminPageHeader title={organization.name}>
        <Button asChild>
          <Link href={`/admin/organizations/${id}/edit`}>Edit Organization</Link>
        </Button>
      </AdminPageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-muted">Total Datasets</p>
            <p className="text-2xl font-bold">{datasetCounts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-muted">Published</p>
            <p className="text-2xl font-bold">{datasetCounts.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-muted">Draft</p>
            <p className="text-2xl font-bold">{datasetCounts.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-muted">Avg Quality</p>
            <p className="text-2xl font-bold">{avgQualityScore}<span className="text-sm font-normal text-text-muted"> / 100</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Members section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Members</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        {members.length === 0 ? (
          <EmptyState title="No members" description="No users are assigned to this organization." />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name || "—"}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Datasets section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Datasets</h2>
        {topDatasets.length === 0 ? (
          <EmptyState
            title="No datasets"
            description="This organization has no datasets yet."
            actionLabel="Create Dataset"
            actionHref="/admin/datasets/new"
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Last Modified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDatasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell>
                      <Link
                        href={`/admin/datasets/${dataset.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        {dataset.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[dataset.status] || "secondary"}>
                        {dataset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <QualityBadge score={dataset.qualityScore} />
                    </TableCell>
                    <TableCell className="text-text-muted">
                      {new Date(dataset.modified).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Recent Activity section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <Card>
          <CardContent className="pt-6">
            <ActivityFeed activities={recentActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
