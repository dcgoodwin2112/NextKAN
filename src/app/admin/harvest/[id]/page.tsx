import { notFound, redirect } from "next/navigation";
import {
  getHarvestSource,
  listHarvestJobs,
  triggerHarvest,
  deleteHarvestSource,
  updateHarvestSource,
} from "@/lib/actions/harvest";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { HarvestDeleteButton } from "./HarvestDeleteButton";
import { Play, Power } from "lucide-react";
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

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HarvestSourceDetailPage({ params }: Props) {
  const { id } = await params;
  const [source, jobs] = await Promise.all([
    getHarvestSource(id),
    listHarvestJobs(id),
  ]);

  if (!source) notFound();

  async function handleRunNow() {
    "use server";
    await triggerHarvest(id);
    redirect(`/admin/harvest/${id}`);
  }

  async function handleToggle() {
    "use server";
    await updateHarvestSource(id, { enabled: !source!.enabled });
    redirect(`/admin/harvest/${id}`);
  }

  async function handleDelete() {
    "use server";
    await deleteHarvestSource(id);
    redirect("/admin/harvest");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Harvest", href: "/admin/harvest" },
          { label: source.name },
        ]}
      />
      <AdminPageHeader title={source.name}>
        <form action={handleRunNow}>
          <Button type="submit" size="sm">
            <Play /> Run Now
          </Button>
        </form>
        <form action={handleToggle}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className={
              source.enabled
                ? "border-warning-subtle text-warning-text hover:bg-warning-subtle"
                : "border-success text-success hover:bg-success-subtle"
            }
          >
            <Power /> {source.enabled ? "Disable" : "Enable"}
          </Button>
        </form>
        <HarvestDeleteButton onDelete={handleDelete} />
      </AdminPageHeader>

      <p className="text-sm text-text-muted mb-6">
        Use <strong>Run Now</strong> to trigger an immediate harvest. The history table below shows the result of each run including datasets created, updated, and archived.
      </p>

      <dl className="grid grid-cols-2 gap-4 text-sm mb-8">
        <div>
          <dt className="font-medium text-text-muted">URL</dt>
          <dd className="mt-1 break-all">{source.url}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Type</dt>
          <dd className="mt-1">{source.type}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Organization</dt>
          <dd className="mt-1">{source.organization.name}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Schedule</dt>
          <dd className="mt-1">{source.schedule || "Manual only"}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Last Status</dt>
          <dd className="mt-1">{source.lastStatus || "Never run"}</dd>
        </div>
        <div>
          <dt className="font-medium text-text-muted">Datasets</dt>
          <dd className="mt-1">{source.datasetCount}</dd>
        </div>
      </dl>

      {source.lastErrorMsg && (
        <div className="mb-6 rounded bg-danger-subtle p-3 text-sm text-danger-text">
          Last error: {source.lastErrorMsg}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Harvest History</h2>
      {jobs.length === 0 ? (
        <p className="text-text-muted">No harvest jobs yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Archived</TableHead>
              <TableHead>Errors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  {new Date(job.startedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      job.status === "success"
                        ? "default"
                        : job.status === "running"
                          ? "secondary"
                          : "destructive"
                    }
                    className={
                      job.status === "success"
                        ? "bg-success-subtle text-success-text hover:bg-success-subtle"
                        : job.status === "running"
                          ? "bg-primary-subtle text-primary-subtle-text hover:bg-primary-subtle"
                          : ""
                    }
                  >
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell>{job.datasetsCreated}</TableCell>
                <TableCell>{job.datasetsUpdated}</TableCell>
                <TableCell>{job.datasetsDeleted}</TableCell>
                <TableCell>
                  {job.errors ? JSON.parse(job.errors).length : 0}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
