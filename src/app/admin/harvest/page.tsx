import Link from "next/link";
import { listHarvestSources } from "@/lib/actions/harvest";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";

export default async function AdminHarvestPage() {
  const sources = await listHarvestSources();

  return (
    <div>
      <AdminPageHeader title="Harvest Sources">
        <Button asChild size="sm">
          <Link href="/admin/harvest/new">New Source</Link>
        </Button>
      </AdminPageHeader>

      {sources.length === 0 ? (
        <EmptyState
          title="No harvest sources configured"
          description="Create one to start harvesting datasets from external catalogs."
          actionLabel="New Source"
          actionHref="/admin/harvest/new"
        />
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
