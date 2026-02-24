"use client";

import { useState, useEffect, useTransition } from "react";

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

interface Organization {
  id: string;
  name: string;
}

export default function AdminImportPage() {
  const [isPending, startTransition] = useTransition();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const orgs = await res.json();
          setOrganizations(orgs);
          if (orgs.length > 0) setOrganizationId(orgs[0].id);
        }
      } catch {
        // ignore
      }
    }
    loadOrgs();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    // Preview first 5 rows
    const text = await f.text();
    const lines = text.split("\n").filter(Boolean).slice(0, 6);
    setPreview(lines.map((l) => l.split(",")));
  }

  function handleImport() {
    if (!file || !organizationId) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const text = await file.text();
        const isJson =
          file.name.endsWith(".json") || file.type === "application/json";

        if (isJson) {
          const catalog = JSON.parse(text);
          const { bulkImportJSON } = await import(
            "@/lib/services/bulk-import"
          );
          const res = await bulkImportJSON(catalog, organizationId);
          setResult(res);
        } else {
          const { bulkImportCSV } = await import(
            "@/lib/services/bulk-import"
          );
          const res = await bulkImportCSV(text, organizationId);
          setResult(res);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bulk Import</h1>

      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Organization
          </label>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary">
            File (CSV or DCAT-US JSON)
          </label>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-text-muted">
            CSV: title, description, keywords (semicolon-separated), accessLevel columns required
          </p>
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto">
            <table className="text-xs border divide-y">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? "bg-surface font-medium" : ""}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 border-r truncate max-w-[200px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={handleImport}
          disabled={!file || !organizationId || isPending}
          className="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Importing..." : "Import"}
        </button>

        {error && (
          <div className="rounded bg-danger-subtle p-3 text-sm text-danger-text">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded bg-success-subtle p-4">
            <p className="font-medium text-success-text">
              Import complete: {result.created} created, {result.skipped} skipped
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-danger">
                  {result.errors.length} error(s):
                </p>
                <ul className="mt-1 text-xs text-danger list-disc list-inside">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
