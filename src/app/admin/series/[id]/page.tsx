import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeries, updateSeries, deleteSeries } from "@/lib/actions/series";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { SeriesDeleteButton } from "./SeriesDeleteButton";
import type { SeriesCreateInput } from "@/lib/schemas/series";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const series = await getSeries(id);
  if (!series) notFound();

  async function handleUpdate(data: SeriesCreateInput) {
    "use server";
    await updateSeries(id, data);
  }

  async function handleDelete() {
    "use server";
    await deleteSeries(id);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Series", href: "/admin/series" },
          { label: "Edit Series" },
        ]}
      />
      <AdminPageHeader title="Edit Series">
        <SeriesDeleteButton onDelete={handleDelete} />
      </AdminPageHeader>

      <SeriesForm
        initialData={{
          id: series.id,
          title: series.title,
          identifier: series.identifier,
          description: series.description,
        }}
        onSubmit={handleUpdate}
      />

      {series.datasets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Datasets in this Series</h2>
          <ul className="space-y-2">
            {series.datasets.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <span className="font-medium">{d.title}</span>
                  <span className="ml-2 text-sm text-text-muted">
                    {d.publisher.name}
                  </span>
                </div>
                <Link
                  href={`/admin/datasets/${d.id}/edit`}
                  className="text-primary text-sm hover:underline"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
