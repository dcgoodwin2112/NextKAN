"use client";

import { useState, useTransition } from "react";
import type { DataDictionaryField } from "@/generated/prisma/client";

const fieldTypes = [
  "string",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
];

interface DataDictionaryEditorProps {
  distributionId: string;
  fields: DataDictionaryField[];
  onSave: (
    distributionId: string,
    fields: {
      name: string;
      title?: string;
      type: string;
      description?: string;
      format?: string;
      sortOrder: number;
    }[]
  ) => Promise<void>;
}

export function DataDictionaryEditor({
  distributionId,
  fields: initialFields,
  onSave,
}: DataDictionaryEditorProps) {
  const [fields, setFields] = useState(
    initialFields.map((f) => ({
      name: f.name,
      title: f.title || "",
      type: f.type,
      description: f.description || "",
      format: f.format || "",
      sortOrder: f.sortOrder,
    }))
  );
  const [isPending, startTransition] = useTransition();

  function updateField(index: number, key: string, value: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(
        distributionId,
        fields.map((f) => ({
          name: f.name,
          title: f.title || undefined,
          type: f.type,
          description: f.description || undefined,
          format: f.format || undefined,
          sortOrder: f.sortOrder,
        }))
      );
    });
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No data dictionary. Import CSV data to auto-generate one.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Title</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fields.map((field, index) => (
              <tr key={field.name}>
                <td className="px-3 py-2 font-mono text-gray-700">
                  {field.name}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={field.title}
                    onChange={(e) => updateField(index, "title", e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Display title"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, "type", e.target.value)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    {fieldTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={field.description}
                    onChange={(e) =>
                      updateField(index, "description", e.target.value)
                    }
                    className="w-full rounded border px-2 py-1 text-sm"
                    placeholder="Description"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Data Dictionary"}
        </button>
      </div>
    </div>
  );
}
