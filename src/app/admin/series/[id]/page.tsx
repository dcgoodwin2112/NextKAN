import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSeries, updateSeries, deleteSeries } from "@/lib/actions/series";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { SeriesDeleteButton } from "./SeriesDeleteButton";

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

      <form action={handleUpdate} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            type="text"
            defaultValue={series.title}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifier">Identifier *</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            defaultValue={series.identifier}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={series.description || ""}
            rows={3}
          />
        </div>
        <Button type="submit">Update Series</Button>
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
