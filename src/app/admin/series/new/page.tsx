import { redirect } from "next/navigation";
import { createSeries } from "@/lib/actions/series";

export default function NewSeriesPage() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createSeries({
      title: formData.get("title") as string,
      identifier: formData.get("identifier") as string,
      description: (formData.get("description") as string) || undefined,
    });
    redirect("/admin/series");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Series</h1>
      <form action={handleCreate} className="max-w-xl space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
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
            className="w-full rounded border px-3 py-2"
            placeholder="e.g. climate-data-annual"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="w-full rounded border px-3 py-2"
            rows={3}
          />
        </div>
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
        >
          Create Series
        </button>
      </form>
    </div>
  );
}
