"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listCharts } from "@/lib/actions/charts";

interface Chart {
  id: string;
  title: string | null;
  chartType: string;
  distribution: {
    dataset: {
      title: string;
    };
  };
}

interface ChartPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (chartId: string, chartTitle: string) => void;
}

export function ChartPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: ChartPickerDialogProps) {
  const [charts, setCharts] = useState<Chart[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listCharts({ search: search || undefined })
      .then((result) => setCharts(result.items as Chart[]))
      .finally(() => setLoading(false));
  }, [open, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert Chart</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search charts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
          {loading && <p className="text-sm text-text-muted">Loading...</p>}
          {!loading && charts.length === 0 && (
            <p className="text-sm text-text-muted">No charts found.</p>
          )}
          {charts.map((chart) => {
            const title = chart.title || "Untitled Chart";
            return (
              <Button
                key={chart.id}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => {
                  onSelect(chart.id, title);
                  onOpenChange(false);
                }}
              >
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="text-xs text-text-muted">
                    {chart.chartType} &middot; {chart.distribution.dataset.title}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
