import Link from "next/link";
import { listCustomFieldDefinitions, deleteCustomFieldDefinition } from "@/lib/actions/custom-fields";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
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
        <Link href="/admin/custom-fields/new">
          <Button>New Custom Field</Button>
        </Link>
      </AdminPageHeader>

      {definitions.length === 0 ? (
        <p className="text-text-muted">No custom fields defined yet.</p>
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
                    <Link href={`/admin/custom-fields/${def.id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
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
