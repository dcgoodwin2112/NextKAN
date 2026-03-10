import Link from "next/link";
import { listTemplates } from "@/lib/actions/templates";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TemplateDeleteButton } from "./TemplateDeleteButton";

export default async function AdminTemplatesPage() {
  const templates = await listTemplates();

  return (
    <div>
      <AdminPageHeader title="Templates">
        <Button asChild>
          <Link href="/admin/templates/new"><Plus /> New Template</Link>
        </Button>
      </AdminPageHeader>

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create templates to pre-fill common dataset fields."
          actionLabel="New Template"
          actionHref="/admin/templates/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((tpl) => (
              <TableRow key={tpl.id}>
                <TableCell className="font-medium">{tpl.name}</TableCell>
                <TableCell className="text-text-muted">
                  {tpl.organization?.name || "Global"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {Object.keys(tpl.fields).length}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/templates/${tpl.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <TemplateDeleteButton templateId={tpl.id} />
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
