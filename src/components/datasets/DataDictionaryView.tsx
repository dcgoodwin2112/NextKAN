import type { DataDictionaryField } from "@/generated/prisma/client";

interface DataDictionaryViewProps {
  fields: DataDictionaryField[];
}

export function DataDictionaryView({ fields }: DataDictionaryViewProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No data dictionary available for this distribution.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-text-muted">Field</th>
            <th className="px-3 py-2 text-left font-medium text-text-muted">Type</th>
            <th className="px-3 py-2 text-left font-medium text-text-muted">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fields.map((field) => (
            <tr key={field.id}>
              <td className="px-3 py-2 font-mono">
                {field.title || field.name}
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">
                  {field.type}
                </span>
              </td>
              <td className="px-3 py-2 text-text-tertiary">
                {field.description || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
