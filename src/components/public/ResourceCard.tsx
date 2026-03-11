"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadLink } from "@/components/analytics/DownloadLink";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ResourceCardProps {
  distribution: {
    id?: string;
    title?: string | null;
    description?: string | null;
    downloadURL?: string | null;
    accessURL?: string | null;
    format?: string | null;
    filePath?: string | null;
  };
  index: number;
  previewContent?: React.ReactNode;
  dictionaryContent?: React.ReactNode;
}

export function ResourceCard({
  distribution,
  index,
  previewContent,
  dictionaryContent,
}: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasExpandableContent = previewContent || dictionaryContent;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {distribution.format && (
            <Badge variant="default" className="shrink-0 text-xs">
              {distribution.format}
            </Badge>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {distribution.title || `Resource ${index + 1}`}
            </p>
            {distribution.description && (
              <p className="text-xs text-text-muted truncate">
                {distribution.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {distribution.downloadURL && (
            <DownloadLink
              href={distribution.downloadURL}
              distributionId={distribution.id}
              className="text-xs text-primary hover:underline"
            >
              Download
            </DownloadLink>
          )}
          {distribution.accessURL && !distribution.downloadURL && (
            <a
              href={distribution.accessURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Access
            </a>
          )}
          {hasExpandableContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse resource details" : "Expand resource details"}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      {expanded && hasExpandableContent && (
        <div className="border-t border-border p-4 space-y-4 bg-surface">
          {previewContent}
          {dictionaryContent}
        </div>
      )}
    </div>
  );
}
