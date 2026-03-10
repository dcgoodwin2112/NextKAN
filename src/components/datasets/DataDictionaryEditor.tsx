"use client";

import { useState, useRef, useTransition } from "react";
import { toast } from "sonner";
import type { DataDictionaryField } from "@/generated/prisma/client";
import {
  parseDictionaryCSV,
  parseDictionaryJSON,
  exportDictionaryCSV,
  exportDictionaryJSON,
} from "@/lib/services/data-dictionary-io";

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
      constraints: f.constraints || "",
      sortOrder: f.sortOrder,
    }))
  );
  const [isPending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImport(file: File) {
    setImportMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const isJSON = file.name.endsWith(".json");
      const result = isJSON ? parseDictionaryJSON(text) : parseDictionaryCSV(text);

      if (result.errors.length > 0) {
        const errorLines = result.errors.map(
          (e) => `Row ${e.row}: ${e.message}`
        );
        setImportMessage({
          type: "error",
          text: `Import errors:\n${errorLines.join("\n")}`,
        });
        if (result.fields.length > 0) {
          setFields(
            result.fields.map((f) => ({
              name: f.name,
              title: f.title || "",
              type: f.type,
              description: f.description || "",
              format: f.format || "",
              constraints: f.constraints || "",
              sortOrder: f.sortOrder,
            }))
          );
        }
      } else if (result.fields.length === 0) {
        setImportMessage({ type: "error", text: "No fields found in file." });
      } else {
        setFields(
          result.fields.map((f) => ({
            name: f.name,
            title: f.title || "",
            type: f.type,
            description: f.description || "",
            format: f.format || "",
            constraints: f.constraints || "",
            sortOrder: f.sortOrder,
          }))
        );
        setImportMessage({
          type: "success",
          text: `Imported ${result.fields.length} field(s). Review and click Save.`,
        });
      }
    };
    reader.readAsText(file);
  }

  function handleExport(format: "csv" | "json") {
    const mapped = fields.map((f) => ({
      name: f.name,
      type: f.type as "string" | "number" | "integer" | "boolean" | "date" | "datetime",
      title: f.title || undefined,
      description: f.description || undefined,
      format: f.format || undefined,
      constraints: f.constraints || undefined,
      sortOrder: f.sortOrder,
    }));

    const content = format === "csv" ? exportDictionaryCSV(mapped) : exportDictionaryJSON(mapped);
    const mimeType = format === "csv" ? "text/csv" : "application/json";
    const ext = format === "csv" ? "csv" : "json";

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-dictionary.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateField(index: number, key: string, value: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  function handleSave() {
    startTransition(async () => {
      try {
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
        toast.success("Data dictionary saved");
      } catch {
        toast.error("Failed to save data dictionary");
      }
    });
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      { name: "", title: "", type: "string", description: "", format: "", constraints: "", sortOrder: prev.length },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      {importMessage && (
        <div
          role="alert"
          className={`mb-3 rounded border p-3 text-sm whitespace-pre-line ${
            importMessage.type === "error"
              ? "border-danger bg-danger/10 text-danger"
              : "border-primary bg-primary-subtle text-primary"
          }`}
        >
          {importMessage.text}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        data-testid="dictionary-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = "";
        }}
      />
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
                      aria-label={`Field ${index + 1} name`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={field.title}
                      onChange={(e) => updateField(index, "title", e.target.value)}
                      className="w-full rounded border px-2 py-1 text-sm"
                      placeholder="Display title"
                      aria-label={`Field ${index + 1} title`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, "type", e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                      aria-label={`Field ${index + 1} type`}
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
                      aria-label={`Field ${index + 1} description`}
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
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addField}
          className="rounded border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-subtle"
        >
          Add Field
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-subtle"
        >
          Import...
        </button>
        {fields.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="rounded border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-subtle"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("json")}
              className="rounded border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary-subtle"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Data Dictionary"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
