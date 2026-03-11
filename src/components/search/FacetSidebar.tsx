"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { FacetGroup } from "@/lib/actions/facets";

interface FacetSidebarProps {
  facets: FacetGroup[];
}

const SHOW_MORE_THRESHOLD = 5;

export function FacetSidebar({ facets }: FacetSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`/datasets?${params.toString()}`);
  }

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/datasets?${params.toString()}`);
  }

  // Collect active filters
  const activeFilters: { key: string; label: string }[] = [];
  for (const facet of facets) {
    const active = searchParams.get(facet.key);
    if (active) {
      const match = facet.values.find((v) => v.value === active);
      activeFilters.push({
        key: facet.key,
        label: match?.label || active,
      });
    }
  }

  return (
    <aside className="w-full space-y-1" aria-label="Search filters">
      {activeFilters.length > 0 && (
        <div className="mb-4 pb-3 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 text-text-muted">
            Active Filters
          </h2>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => removeFilter(f.key)}
                aria-label={`Remove filter: ${f.label}`}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:opacity-80 gap-1 text-xs"
                >
                  {f.label} &times;
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {facets.map((facet) => {
        const isExpanded = expanded[facet.key] ?? false;
        const visibleValues = isExpanded
          ? facet.values
          : facet.values.slice(0, SHOW_MORE_THRESHOLD);
        const hasMore = facet.values.length > SHOW_MORE_THRESHOLD;

        return (
          <Collapsible key={facet.key} defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold hover:text-foreground group">
              <span>{facet.name}</span>
              <ChevronDown className="h-4 w-4 text-text-muted transition-transform group-data-[state=closed]:rotate-[-90deg]" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="space-y-0.5 pb-3">
                {visibleValues.map((v) => {
                  const isActive = searchParams.get(facet.key) === v.value;
                  return (
                    <li key={v.value}>
                      <button
                        onClick={() => toggleParam(facet.key, v.value)}
                        className={`text-sm w-full text-left px-2 py-1 rounded flex items-center justify-between transition-colors ${
                          isActive
                            ? "font-medium text-primary-subtle-text bg-primary-subtle"
                            : "text-text-secondary hover:bg-surface-alt"
                        }`}
                      >
                        <span className="truncate">{v.label}</span>
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {v.count}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 mb-2"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [facet.key]: !prev[facet.key],
                    }))
                  }
                >
                  {isExpanded
                    ? "Show less"
                    : `Show ${facet.values.length - SHOW_MORE_THRESHOLD} more`}
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </aside>
  );
}
