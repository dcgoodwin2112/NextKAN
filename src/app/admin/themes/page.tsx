import Link from "next/link";
import { listThemes } from "@/lib/actions/themes";
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
import { ThemeDeleteButton } from "./ThemeDeleteButton";

export default async function AdminThemesPage() {
  const themes = await listThemes();

  return (
    <div>
      <AdminPageHeader title="Themes">
        <Button asChild>
          <Link href="/admin/themes/new"><Plus /> New Theme</Link>
        </Button>
      </AdminPageHeader>

      {themes.length === 0 ? (
        <EmptyState
          title="No themes yet"
          description="Add themes to categorize datasets."
          actionLabel="New Theme"
          actionHref="/admin/themes/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Datasets</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {themes.map((theme) => (
              <TableRow key={theme.id}>
                <TableCell>
                  {theme.color ? (
                    <div
                      className="h-6 w-6 rounded-full border border-border"
                      style={{ backgroundColor: theme.color }}
                      title={theme.color}
                    />
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{theme.name}</TableCell>
                <TableCell className="text-text-muted text-sm max-w-xs truncate">
                  {theme.description || "—"}
                </TableCell>
                <TableCell className="text-text-muted">
                  {theme._count.datasets}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/themes/${theme.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <ThemeDeleteButton themeId={theme.id} datasetCount={theme._count.datasets} />
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
