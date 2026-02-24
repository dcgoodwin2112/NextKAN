import { notFound, redirect } from "next/navigation";
import {
  getHarvestSource,
  listHarvestJobs,
  triggerHarvest,
  deleteHarvestSource,
  updateHarvestSource,
} from "@/lib/actions/harvest";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{source.name}</h1>
        <div className="flex gap-2">
          <form action={handleRunNow}>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Run Now
            </button>
          </form>
          <form action={handleToggle}>
            <button
              type="submit"
              className={`rounded border px-4 py-2 text-sm ${
                source.enabled
                  ? "border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                  : "border-green-300 text-green-600 hover:bg-green-50"
              }`}
            >
              {source.enabled ? "Disable" : "Enable"}
            </button>
          </form>
          <form action={handleDelete}>
            <button
              type="submit"
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-8">
        <div>
          <dt className="font-medium text-gray-500">URL</dt>
          <dd className="mt-1 break-all">{source.url}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Type</dt>
          <dd className="mt-1">{source.type}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Organization</dt>
          <dd className="mt-1">{source.organization.name}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Schedule</dt>
          <dd className="mt-1">{source.schedule || "Manual only"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Last Status</dt>
          <dd className="mt-1">{source.lastStatus || "Never run"}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Datasets</dt>
          <dd className="mt-1">{source.datasetCount}</dd>
        </div>
      </div>

      {source.lastErrorMsg && (
        <div className="mb-6 rounded bg-red-50 p-3 text-sm text-red-600">
          Last error: {source.lastErrorMsg}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Harvest History</h2>
      {jobs.length === 0 ? (
        <p className="text-gray-500">No harvest jobs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Started</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Updated</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Archived</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-2">
                    {new Date(job.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        job.status === "success"
                          ? "bg-green-100 text-green-700"
                          : job.status === "running"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
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
