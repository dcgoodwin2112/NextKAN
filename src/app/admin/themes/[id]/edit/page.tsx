import { notFound } from "next/navigation";
import { getTheme, updateTheme } from "@/lib/actions/themes";
import { ThemeForm } from "@/components/admin/ThemeForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ThemeDeleteButton } from "../../ThemeDeleteButton";
import type { ThemeCreateInput } from "@/lib/schemas/theme";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditThemePage({ params }: Props) {
  const { id } = await params;
  const theme = await getTheme(id);

  if (!theme) notFound();

  async function handleUpdate(data: ThemeCreateInput) {
    "use server";
    await updateTheme(id, data);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Themes", href: "/admin/themes" },
          { label: "Edit Theme" },
        ]}
      />
      <AdminPageHeader title="Edit Theme">
        <ThemeDeleteButton themeId={theme.id} />
      </AdminPageHeader>
      <ThemeForm initialData={theme} onSubmit={handleUpdate} />
    </div>
  );
}
