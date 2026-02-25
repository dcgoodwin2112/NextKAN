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

  function addField() {
    setFields((prev) => [
      ...prev,
      { name: "", title: "", type: "string", description: "", format: "", sortOrder: prev.length },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      {fields.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Name</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Title</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Type</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted">Description</th>
                <th className="px-3 py-2 text-left font-medium text-text-muted"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((field, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, "name", e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm font-mono"
                      placeholder="field_name"
                    />
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
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-sm text-danger hover:text-danger-hover"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={addField}
          className="rounded border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-subtle"
        >
          Add Field
        </button>
        {fields.length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Data Dictionary"}
          </button>
        )}
      </div>
    </div>
  );
}
