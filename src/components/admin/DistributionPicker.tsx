"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export interface ChartableDistribution {
  distributionId: string;
  datasetTitle: string;
  distributionTitle: string;
  format: string;
  organization: string;
  rowCount: number;
}

interface DistributionPickerProps {
  distributions: ChartableDistribution[];
  value: string;
  onChange: (id: string) => void;
}

interface GroupedDataset {
  datasetTitle: string;
  organization: string;
  items: ChartableDistribution[];
}

export function DistributionPicker({
  distributions,
  value,
  onChange,
}: DistributionPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return distributions;
    const q = search.toLowerCase();
    return distributions.filter(
      (d) =>
        d.datasetTitle.toLowerCase().includes(q) ||
        d.distributionTitle.toLowerCase().includes(q) ||
        d.organization.toLowerCase().includes(q)
    );
  }, [distributions, search]);

  const groups = useMemo(() => {
    const map = new Map<string, GroupedDataset>();
    for (const d of filtered) {
      const key = d.datasetTitle;
      if (!map.has(key)) {
        map.set(key, {
          datasetTitle: d.datasetTitle,
          organization: d.organization,
          items: [],
        });
      }
      map.get(key)!.items.push(d);
    }
    return Array.from(map.values());
  }, [filtered]);

  const selected = distributions.find((d) => d.distributionId === value);

  return (
    <div className="space-y-2">
      {selected && (
        <div className="flex items-center gap-2 rounded border border-primary bg-primary-subtle px-3 py-2 text-sm">
          <Check className="h-4 w-4 text-primary" />
          <span className="font-medium">{selected.datasetTitle}</span>
          <span className="text-text-muted">—</span>
          <span>{selected.distributionTitle}</span>
          {selected.format && (
            <Badge variant="secondary">{selected.format}</Badge>
          )}
          <span className="text-text-muted">({selected.rowCount} rows)</span>
        </div>
      )}

      <Input
        placeholder="Search distributions..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search distributions"
      />

      <div className="max-h-80 overflow-y-auto rounded border border-border">
        {groups.length === 0 ? (
          <p className="p-4 text-sm text-text-muted">
            No matching distributions
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.datasetTitle}>
              <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface-alt px-3 py-2 text-sm font-medium">
                <span>{group.datasetTitle}</span>
                {group.organization && (
                  <span className="text-text-muted">
                    — {group.organization}
                  </span>
                )}
                <Badge variant="outline">{group.items.length}</Badge>
              </div>
              {group.items.map((item) => {
                const isSelected = item.distributionId === value;
                return (
                  <button
                    key={item.distributionId}
                    type="button"
                    onClick={() => onChange(item.distributionId)}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface-alt ${
                      isSelected ? "bg-primary-subtle" : ""
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                    <span>{item.distributionTitle}</span>
                    {item.format && (
                      <Badge variant="secondary">{item.format}</Badge>
                    )}
                    <span className="ml-auto text-text-muted">
                      {item.rowCount} rows
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
