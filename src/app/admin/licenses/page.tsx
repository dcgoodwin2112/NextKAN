import Link from "next/link";
import { listLicenses } from "@/lib/actions/licenses";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
import { Badge } from "@/components/ui/badge";
import { LicenseDeleteButton } from "./LicenseDeleteButton";

export default async function AdminLicensesPage() {
  const licenses = await listLicenses();

  return (
    <div>
      <AdminPageHeader title="Licenses">
        <Button asChild>
          <Link href="/admin/licenses/new">New License</Link>
        </Button>
      </AdminPageHeader>

      {licenses.length === 0 ? (
        <EmptyState
          title="No licenses yet"
          description="Add licenses to use in dataset forms."
          actionLabel="New License"
          actionHref="/admin/licenses/new"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licenses.map((license) => (
              <TableRow key={license.id}>
                <TableCell className="font-medium">{license.name}</TableCell>
                <TableCell className="text-text-muted text-sm max-w-xs truncate">
                  {license.url ? (
                    <a
                      href={license.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {license.url}
                    </a>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {license.isDefault && <Badge variant="secondary">Default</Badge>}
                </TableCell>
                <TableCell className="text-text-muted">{license.sortOrder}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/licenses/${license.id}/edit`}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </Link>
                    <LicenseDeleteButton licenseId={license.id} />
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
