import { notFound, redirect } from "next/navigation";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/actions/templates";
import { listOrganizations } from "@/lib/actions/organizations";
import { listThemes } from "@/lib/actions/themes";
import { listSeries } from "@/lib/actions/series";
import { TemplateForm } from "@/components/admin/TemplateForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { TemplateDeleteButton } from "../../TemplateDeleteButton";
import type { TemplateCreateInput } from "@/lib/schemas/template";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;
  const [template, organizations, themes, allSeries] = await Promise.all([
    getTemplate(id),
    listOrganizations(),
    listThemes(),
    listSeries(),
  ]);

  if (!template) notFound();

  async function handleUpdate(data: TemplateCreateInput) {
    "use server";
    await updateTemplate(id, data);
  }

  async function handleDelete() {
    "use server";
    await deleteTemplate(id);
    redirect("/admin/templates");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Templates", href: "/admin/templates" },
          { label: "Edit Template" },
        ]}
      />
      <AdminPageHeader title="Edit Template">
        <TemplateDeleteButton templateId={template.id} />
      </AdminPageHeader>
      <TemplateForm
        initialData={template}
        organizations={organizations}
        themes={themes}
        series={allSeries.map((s) => ({ id: s.id, title: s.title }))}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
