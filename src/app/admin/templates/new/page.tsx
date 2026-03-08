import { createTemplate } from "@/lib/actions/templates";
import { listOrganizations } from "@/lib/actions/organizations";
import { listThemes } from "@/lib/actions/themes";
import { listSeries } from "@/lib/actions/series";
import { listLicenses } from "@/lib/actions/licenses";
import { auth } from "@/lib/auth";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import type { TemplateCreateInput } from "@/lib/schemas/template";

export default async function NewTemplatePage() {
  const [organizations, themes, seriesResult, session, licenses] = await Promise.all([
    listOrganizations(),
    listThemes(),
    listSeries(),
    auth(),
    listLicenses(),
  ]);
  const allSeries = seriesResult.items;

  async function handleCreate(data: TemplateCreateInput) {
    "use server";
    await createTemplate(data, session?.user?.id);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Templates", href: "/admin/templates" },
          { label: "New Template" },
        ]}
      />
      <AdminPageHeader title="New Template" />
      <TemplateForm
        organizations={organizations}
        themes={themes}
        series={allSeries.map((s) => ({ id: s.id, title: s.title }))}
        licenses={licenses}
        onSubmit={handleCreate}
      />
    </div>
  );
}
