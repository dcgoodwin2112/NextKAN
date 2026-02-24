import Link from "next/link";
import { listHarvestSources } from "@/lib/actions/harvest";

export default async function AdminHarvestPage() {
  const sources = await listHarvestSources();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Harvest Sources</h1>
        <Link
          href="/admin/harvest/new"
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover"
        >
          New Source
        </Link>
      </div>

      {sources.length === 0 ? (
        <p className="text-text-muted">
          No harvest sources configured. Create one to start harvesting datasets
          from external catalogs.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Name</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Type</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Status</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Datasets</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Last Run</th>
                <th className="px-4 py-2 text-left font-medium text-text-muted">Enabled</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="px-4 py-2 font-medium">{source.name}</td>
                  <td className="px-4 py-2 text-text-muted">{source.type}</td>
                  <td className="px-4 py-2">
                    {source.lastStatus && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          source.lastStatus === "success"
                            ? "bg-success-subtle text-success-text"
                            : source.lastStatus === "partial"
                              ? "bg-warning-subtle text-warning-text"
                              : "bg-danger-subtle text-danger-text"
                        }`}
                      >
                        {source.lastStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{source.datasetCount}</td>
                  <td className="px-4 py-2 text-text-muted">
                    {source.lastHarvestAt
                      ? new Date(source.lastHarvestAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        source.enabled
                          ? "bg-success-subtle text-success-text"
                          : "bg-surface-alt text-text-muted"
                      }`}
                    >
                      {source.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/harvest/${source.id}`}
                      className="text-primary hover:underline"
                    >
                      Manage
                    </Link>
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
