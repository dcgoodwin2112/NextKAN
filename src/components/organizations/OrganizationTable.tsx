import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrganizationTableProps {
  organizations: {
    id: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    parent?: { id: string; name: string } | null;
    _count?: { datasets: number };
  }[];
}

export function OrganizationTable({ organizations }: OrganizationTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Parent</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Datasets</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((org) => (
          <TableRow key={org.id}>
            <TableCell className="font-medium">
              <Link
                href={`/admin/organizations/${org.id}`}
                className="hover:underline"
              >
                {org.parentId ? "└─ " : ""}
                {org.name}
              </Link>
            </TableCell>
            <TableCell className="text-text-muted text-sm">
              {org.parent ? (
                <Link
                  href={`/admin/organizations/${org.parent.id}`}
                  className="hover:underline"
                >
                  {org.parent.name}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-text-muted text-sm">
              {org.description
                ? org.description.length > 100
                  ? org.description.slice(0, 100) + "..."
                  : org.description
                : "—"}
            </TableCell>
            <TableCell>
              {org._count?.datasets ?? 0}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
