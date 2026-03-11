"use client";

import { useState, useEffect, useTransition } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importCSV, importJSON } from "@/lib/actions/import";

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

        const res = isJson
          ? await importJSON(text, organizationId)
          : await importCSV(text, organizationId);
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div>
      <AdminPageHeader title="Bulk Import" />

      <div className="text-sm text-text-muted mb-6 max-w-2xl space-y-2">
        <p>
          Import multiple datasets at once from a CSV or DCAT-US JSON file. All imported datasets will be assigned to the selected organization.
        </p>
        <p>
          <strong>CSV format:</strong> must include <code>title</code>, <code>description</code>, <code>keywords</code> (semicolon-separated), and <code>accessLevel</code> columns. Additional columns are ignored.
        </p>
        <p>
          <strong>JSON format:</strong> must be a valid DCAT-US data.json structure with a <code>dataset</code> array. Existing datasets with matching identifiers will be skipped.
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="space-y-2">
          <Label htmlFor="organizationId">Organization</Label>
          <NativeSelect
            id="organizationId"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label htmlFor="importFile">File (CSV or DCAT-US JSON)</Label>
          <input
            id="importFile"
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          <p className="text-xs text-text-muted">
            CSV: title, description, keywords (semicolon-separated), accessLevel columns required
          </p>
        </div>

        {preview.length > 0 && (
          <Table className="text-xs">
            {preview[0] && (
              <TableHeader>
                <TableRow>
                  {preview[0].map((cell, j) => (
                    <TableHead key={j} className="truncate max-w-[200px]">
                      {cell}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            )}
            <TableBody>
              {preview.slice(1).map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="truncate max-w-[200px]">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button
          type="button"
          onClick={handleImport}
          disabled={!file || !organizationId || isPending}
        >
          <Upload /> {isPending ? "Importing..." : "Import"}
        </Button>

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
