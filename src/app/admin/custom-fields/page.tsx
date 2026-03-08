import Link from "next/link";
import { listCustomFieldDefinitions, deleteCustomFieldDefinition } from "@/lib/actions/custom-fields";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomFieldDeleteButton } from "./CustomFieldDeleteButton";
import { redirect } from "next/navigation";

export default async function CustomFieldsPage() {
  const definitions = await listCustomFieldDefinitions();

  async function handleDelete(id: string) {
    "use server";
    await deleteCustomFieldDefinition(id);
    redirect("/admin/custom-fields");
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Custom Fields" },
        ]}
      />
      <AdminPageHeader title="Custom Fields">
        <Button asChild>
          <Link href="/admin/custom-fields/new">New Custom Field</Link>
        </Button>
      </AdminPageHeader>

      {definitions.length === 0 ? (
        <EmptyState
          title="No custom fields defined yet"
          description="Create custom fields to add extra metadata to your datasets."
          actionLabel="New Custom Field"
          actionHref="/admin/custom-fields/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.map((def) => (
              <TableRow key={def.id}>
                <TableCell className="font-medium">{def.label}</TableCell>
                <TableCell className="font-mono text-sm">{def.name}</TableCell>
                <TableCell>{def.type}</TableCell>
                <TableCell>{def.required ? "Yes" : "No"}</TableCell>
                <TableCell>{def.sortOrder}</TableCell>
                <TableCell>{def.organizationId ? "Org-scoped" : "Global"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/custom-fields/${def.id}/edit`}>Edit</Link>
                    </Button>
                    <CustomFieldDeleteButton
                      id={def.id}
                      label={def.label}
                      onDelete={handleDelete}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
