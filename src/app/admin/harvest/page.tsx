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
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          New Source
        </Link>
      </div>

      {sources.length === 0 ? (
        <p className="text-gray-500">
          No harvest sources configured. Create one to start harvesting datasets
          from external catalogs.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Datasets</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Last Run</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">Enabled</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="px-4 py-2 font-medium">{source.name}</td>
                  <td className="px-4 py-2 text-gray-500">{source.type}</td>
                  <td className="px-4 py-2">
                    {source.lastStatus && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          source.lastStatus === "success"
                            ? "bg-green-100 text-green-700"
                            : source.lastStatus === "partial"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {source.lastStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{source.datasetCount}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {source.lastHarvestAt
                      ? new Date(source.lastHarvestAt).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        source.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {source.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/harvest/${source.id}`}
                      className="text-blue-600 hover:underline"
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
