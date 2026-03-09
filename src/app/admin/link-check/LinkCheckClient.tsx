"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LinkCheckResult } from "@/lib/services/link-checker";

function statusVariant(result: LinkCheckResult) {
  if (result.status === "error") return "destructive" as const;
  if (typeof result.status === "number") {
    if (result.status >= 200 && result.status < 300) return "default" as const;
    if (result.status >= 300 && result.status < 400) return "secondary" as const;
  }
  return "destructive" as const;
}

function statusLabel(result: LinkCheckResult) {
  if (result.status === "error") return result.error ?? "Error";
  return String(result.status);
}

export function LinkCheckClient() {
  const [results, setResults] = useState<LinkCheckResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/link-check", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Link check failed");
      }
      const data: LinkCheckResult[] = await res.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const broken = results?.filter((r) => !r.ok) ?? [];
  const healthy = results?.filter((r) => r.ok) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button onClick={runCheck} disabled={loading}>
          {loading ? "Checking..." : "Check Links"}
        </Button>
        {results && (
          <p className="text-sm text-text-muted">
            {results.length} URL{results.length !== 1 ? "s" : ""} checked
            {broken.length > 0
              ? ` — ${broken.length} broken`
              : " — all links healthy"}
          </p>
        )}
      </div>

      {error && (
        <Card>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && results.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">
              No distributions with URLs found.
            </p>
          </CardContent>
        </Card>
      )}

      {results && results.length > 0 && (
        <>
          {broken.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent>
                  <p className="text-sm text-text-muted">Total Checked</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-text-muted">Healthy</p>
                  <p className="text-2xl font-bold text-success">
                    {healthy.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-text-muted">Broken</p>
                  <p className="text-2xl font-bold text-danger">
                    {broken.length}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Distribution</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={`${r.distributionId}-${r.url}-${i}`}>
                  <TableCell className="font-medium">
                    {r.distributionTitle}
                  </TableCell>
                  <TableCell className="text-text-muted">
                    {r.datasetTitle}
                  </TableCell>
                  <TableCell>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm break-all"
                    >
                      {r.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r)}>
                      {statusLabel(r)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
