"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { FacetGroup } from "@/lib/actions/facets";

interface FacetSidebarProps {
  facets: FacetGroup[];
}

export function FacetSidebar({ facets }: FacetSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Track which sections are collapsed
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.get(key);

    if (current === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Reset to page 1 when filtering
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
  const activeFilters: { key: string; label: string; value: string }[] = [];
  for (const facet of facets) {
    const active = searchParams.get(facet.key);
    if (active) {
      const match = facet.values.find((v) => v.value === active);
      activeFilters.push({
        key: facet.key,
        label: match?.label || active,
        value: active,
      });
    }
  }

  return (
    <aside className="w-full" aria-label="Search filters">
      {activeFilters.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold mb-2">Active Filters</h2>
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => removeFilter(f.key)}
                className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs text-primary-subtle-text hover:opacity-80"
                aria-label={`Remove ${f.label} filter`}
              >
                {f.label} &times;
              </button>
            ))}
          </div>
        </div>
      )}

      {facets.map((facet) => (
        <div key={facet.key} className="mb-4">
          <button
            type="button"
            onClick={() =>
              setCollapsed((prev) => ({ ...prev, [facet.key]: !prev[facet.key] }))
            }
            className="flex items-center justify-between w-full text-sm font-semibold mb-1"
          >
            <span>{facet.name}</span>
            <span className="text-text-muted">{collapsed[facet.key] ? "+" : "-"}</span>
          </button>
          {!collapsed[facet.key] && (
            <ul className="space-y-0.5">
              {facet.values.map((v) => {
                const isActive = searchParams.get(facet.key) === v.value;
                return (
                  <li key={v.value}>
                    <button
                      onClick={() => toggleParam(facet.key, v.value)}
                      className={`text-sm w-full text-left px-1 py-0.5 rounded hover:bg-surface-alt flex justify-between ${
                        isActive ? "font-medium text-primary-subtle-text bg-primary-subtle" : "text-text-secondary"
                      }`}
                    >
                      <span>{v.label}</span>
                      <span className="text-text-muted text-xs">{v.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </aside>
  );
}
