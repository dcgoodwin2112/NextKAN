import Link from "next/link";
import { listDatasets } from "@/lib/actions/datasets";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";

export default async function AdminDatasetsPage() {
  const { datasets } = await listDatasets();

  return (
    <div>
      <AdminPageHeader title="Datasets">
        <Button asChild>
          <Link href="/admin/datasets/new">New Dataset</Link>
        </Button>
      </AdminPageHeader>
      {datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          description="Create your first dataset to get started."
          actionLabel="New Dataset"
          actionHref="/admin/datasets/new"
        />
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
