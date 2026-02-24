import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSeries, updateSeries, deleteSeries } from "@/lib/actions/series";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const series = await getSeries(id);
  if (!series) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateSeries(id, {
      title: formData.get("title") as string,
      identifier: formData.get("identifier") as string,
      description: (formData.get("description") as string) || undefined,
    });
    redirect("/admin/series");
  }

  async function handleDelete() {
    "use server";
    await deleteSeries(id);
    redirect("/admin/series");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Edit Series</h1>
        <form action={handleDelete}>
          <button
            type="submit"
            className="rounded border border-danger px-4 py-2 text-danger hover:bg-danger-subtle"
          >
            Delete
          </button>
        </form>
      </div>

      <form action={handleUpdate} className="max-w-xl space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={series.title}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium mb-1">
            Identifier *
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            defaultValue={series.identifier}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={series.description || ""}
            className="w-full rounded border px-3 py-2"
            rows={3}
          />
        </div>
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Update Series
        </button>
      </form>

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
