import { createTheme } from "@/lib/actions/themes";
import { ThemeForm } from "@/components/admin/ThemeForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import type { ThemeCreateInput } from "@/lib/schemas/theme";

export default function NewThemePage() {
  async function handleCreate(data: ThemeCreateInput) {
    "use server";
    await createTheme(data);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Themes", href: "/admin/themes" },
          { label: "New Theme" },
        ]}
      />
      <AdminPageHeader title="New Theme" />
      <ThemeForm onSubmit={handleCreate} />
    </div>
  );
}
