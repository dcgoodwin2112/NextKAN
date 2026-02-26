"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataPreview } from "@/components/datasets/DataPreview";
import Link from "next/link";

interface DatastoreInfo {
  status: string;
  rowCount: number;
  columns: string;
  errorMessage: string | null;
}

export interface DistributionPreviewItem {
  id: string;
  title: string | null;
  format: string | null;
  mediaType: string | null;
  filePath: string | null;
  downloadURL: string | null;
  fileName: string | null;
  fileSize: number | null;
  datastoreTable: DatastoreInfo | null;
  hasDictionary: boolean;
}

interface DistributionPreviewPanelProps {
  distributions: DistributionPreviewItem[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "ready"
      ? "default"
      : status === "error"
        ? "destructive"
        : "secondary";

  return <Badge variant={variant}>{status}</Badge>;
}

function getColumnCount(columns: string): number {
  try {
    const parsed = JSON.parse(columns);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export function DistributionPreviewPanel({
  distributions,
}: DistributionPreviewPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (distributions.length === 0) return null;

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3">
      {distributions.map((dist) => {
        const isOpen = expanded[dist.id] ?? false;
        const label = dist.title || dist.fileName || dist.id;

        return (
          <Card key={dist.id}>
            <button
              type="button"
              onClick={() => toggle(dist.id)}
              className="w-full px-4 py-3 flex items-center gap-2 text-left"
            >
              {isOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <span className="font-medium text-sm flex-1">{label}</span>
              {dist.format && (
                <Badge variant="outline">{dist.format.toUpperCase()}</Badge>
              )}
              {dist.datastoreTable && (
                <StatusBadge status={dist.datastoreTable.status} />
              )}
              {dist.fileSize != null && (
                <span className="text-xs text-text-muted">
                  {formatFileSize(dist.fileSize)}
                </span>
              )}
            </button>

            {isOpen && (
              <CardContent className="pt-0 space-y-4">
                {dist.datastoreTable && (
                  <div className="flex items-center gap-4 text-sm">
                    <StatusBadge status={dist.datastoreTable.status} />
                    {dist.datastoreTable.status === "ready" && (
                      <>
                        <span>
                          {dist.datastoreTable.rowCount.toLocaleString()} rows
                        </span>
                        <span>
                          {getColumnCount(dist.datastoreTable.columns)} columns
                        </span>
                      </>
                    )}
                    {dist.datastoreTable.status === "error" &&
                      dist.datastoreTable.errorMessage && (
                        <span className="text-destructive">
                          {dist.datastoreTable.errorMessage}
                        </span>
                      )}
                  </div>
                )}

                <DataPreview
                  distributionId={dist.id}
                  format={dist.format}
                  filePath={dist.filePath}
                  downloadURL={dist.downloadURL}
                />

                <div className="flex gap-3 text-sm">
                  {dist.hasDictionary && (
                    <Link
                      href="#data-dictionaries"
                      className="text-primary hover:underline"
                    >
                      Edit Dictionary
                    </Link>
                  )}
                  <Link
                    href={`/datasets/${dist.id}`}
                    className="text-primary hover:underline"
                  >
                    View on public page
                  </Link>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
