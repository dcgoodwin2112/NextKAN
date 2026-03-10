"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { listChartableDistributions } from "@/lib/actions/charts";
import type { ChartableDistribution } from "@/components/admin/DistributionPicker";

interface GroupedDataset {
  datasetTitle: string;
  organization: string;
  items: ChartableDistribution[];
}

interface DistributionPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (distribution: ChartableDistribution) => void;
  selectedId?: string;
}

export function DistributionPickerDialog({
  open,
  onOpenChange,
  onSelect,
  selectedId,
}: DistributionPickerDialogProps) {
  const [distributions, setDistributions] = useState<ChartableDistribution[]>(
    []
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listChartableDistributions()
      .then(setDistributions)
      .finally(() => setLoading(false));
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Distribution</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search distributions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search distributions"
        />
        <div className="max-h-80 overflow-y-auto rounded border border-border mt-2">
          {loading && (
            <p className="p-4 text-sm text-text-muted">Loading...</p>
          )}
          {!loading && groups.length === 0 && (
            <p className="p-4 text-sm text-text-muted">
              No matching distributions
            </p>
          )}
          {!loading &&
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
                  const isSelected = item.distributionId === selectedId;
                  return (
                    <button
                      key={item.distributionId}
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        onOpenChange(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface-alt ${
                        isSelected ? "bg-primary-subtle" : ""
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
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
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
