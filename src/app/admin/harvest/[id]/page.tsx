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
import { Button } from "@/components/ui/button";

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
            Run Now
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
            {source.enabled ? "Disable" : "Enable"}
          </Button>
        </form>
        <HarvestDeleteButton onDelete={handleDelete} />
      </AdminPageHeader>

      <div className="grid grid-cols-2 gap-4 text-sm mb-8">
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
      </div>

      {source.lastErrorMsg && (
        <div className="mb-6 rounded bg-danger-subtle p-3 text-sm text-danger-text">
          Last error: {source.lastErrorMsg}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Harvest History</h2>
      {jobs.length === 0 ? (
        <p className="text-text-muted">No harvest jobs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Started</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Status</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Created</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Updated</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Archived</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-2">
                    {new Date(job.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        job.status === "success"
                          ? "bg-success-subtle text-success-text"
                          : job.status === "running"
                            ? "bg-primary-subtle text-primary-subtle-text"
                            : "bg-danger-subtle text-danger-text"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{job.datasetsCreated}</td>
                  <td className="px-4 py-2">{job.datasetsUpdated}</td>
                  <td className="px-4 py-2">{job.datasetsDeleted}</td>
                  <td className="px-4 py-2">
                    {job.errors ? JSON.parse(job.errors).length : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
