import { redirect } from "next/navigation";
import { createSeries } from "@/lib/actions/series";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { SeriesForm } from "@/components/admin/SeriesForm";
import type { SeriesCreateInput } from "@/lib/schemas/series";

export default function NewSeriesPage() {
  async function handleCreate(data: SeriesCreateInput) {
    "use server";
    await createSeries(data);
    redirect("/admin/series");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Series", href: "/admin/series" },
          { label: "New Series" },
        ]}
      />
      <AdminPageHeader title="New Series" />
      <SeriesForm onSubmit={handleCreate} />
    </div>
  );
}
