import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusStyles: Record<string, string> = {
  draft: "bg-warning-subtle text-warning-text",
  published: "bg-success-subtle text-success-text",
  archived: "bg-surface-alt text-text-tertiary",
};

interface DatasetTableProps {
  datasets: {
    id: string;
    title: string;
    status: string;
    modified: Date;
    publisher: { name: string };
    distributions: { format?: string | null }[];
  }[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
}

export function DatasetTable({
  datasets,
  selectable,
  selectedIds,
  onToggle,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
}: DatasetTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-10">
              <Checkbox
                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                onCheckedChange={() => onSelectAll?.()}
                aria-label="Select all datasets"
              />
            </TableHead>
          )}
          <TableHead>Title</TableHead>
          <TableHead>Organization</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Formats</TableHead>
          <TableHead>Modified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {datasets.map((dataset) => {
          const formats = [
            ...new Set(
              dataset.distributions
                .map((d) => d.format)
                .filter(Boolean) as string[]
            ),
          ];
          return (
            <TableRow key={dataset.id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds?.has(dataset.id) ?? false}
                    onCheckedChange={() => onToggle?.(dataset.id)}
                    aria-label={`Select ${dataset.title}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                <Link
                  href={`/admin/datasets/${dataset.id}/edit`}
                  className="hover:underline"
                >
                  {dataset.title}
                </Link>
              </TableCell>
              <TableCell>{dataset.publisher.name}</TableCell>
              <TableCell>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[dataset.status] || "bg-surface-alt text-text-tertiary"}`}
                >
                  {dataset.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {formats.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-primary-subtle px-2 py-0.5 text-xs text-primary-subtle-text"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-text-muted text-sm">
                {new Date(dataset.modified).toLocaleDateString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
