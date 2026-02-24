import Link from "next/link";
import { listDatasets } from "@/lib/actions/datasets";
import { DatasetCard } from "@/components/datasets/DatasetCard";

export default async function AdminDatasetsPage() {
  const { datasets } = await listDatasets();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Datasets</h1>
        <Link
          href="/admin/datasets/new"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          New Dataset
        </Link>
      </div>
      {datasets.length === 0 ? (
        <p className="text-gray-500">No datasets yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} adminView />
          ))}
        </div>
      )}
    </div>
  );
}
