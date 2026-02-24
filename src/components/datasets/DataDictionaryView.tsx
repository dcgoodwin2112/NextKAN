import type { DataDictionaryField } from "@/generated/prisma/client";

interface DataDictionaryViewProps {
  fields: DataDictionaryField[];
}

export function DataDictionaryView({ fields }: DataDictionaryViewProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No data dictionary available for this distribution.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Field</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {fields.map((field) => (
            <tr key={field.id}>
              <td className="px-3 py-2 font-mono">
                {field.title || field.name}
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                  {field.type}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {field.description || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
