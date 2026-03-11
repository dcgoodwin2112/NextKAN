"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { FacetGroup } from "@/lib/actions/facets";

interface ActiveFiltersProps {
  facets: FacetGroup[];
}

export function ActiveFilters({ facets }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  if (activeFilters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/datasets?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const search = searchParams.get("search");
    if (search) params.set("search", search);
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `/datasets?${qs}` : "/datasets");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-text-muted font-medium">Filters:</span>
      {activeFilters.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => removeFilter(f.key)}
          aria-label={`Remove filter: ${f.label}`}
        >
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer hover:opacity-80"
          >
            {f.label}
            <X className="h-3 w-3" />
          </Badge>
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="text-sm h-6"
        onClick={clearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
