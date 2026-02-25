import { redirect } from "next/navigation";
import { createSeries } from "@/lib/actions/series";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

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
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Series", href: "/admin/series" },
          { label: "New Series" },
        ]}
      />
      <AdminPageHeader title="New Series" />
      <form action={handleCreate} className="max-w-xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            name="title"
            type="text"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifier">Identifier *</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            placeholder="e.g. climate-data-annual"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
          />
        </div>
        <Button type="submit">Create Series</Button>
      </form>
    </div>
  );
}
