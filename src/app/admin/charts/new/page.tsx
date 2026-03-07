"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createChart,
  listChartableDistributions,
} from "@/lib/actions/charts";
import { ChartRenderer } from "@/components/visualizations/ChartRenderer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  DistributionPicker,
  type ChartableDistribution,
} from "@/components/admin/DistributionPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const chartTypeOptions = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "scatter", label: "Scatter Plot" },
];

interface ColumnInfo {
  name: string;
  type: string;
}

type ChartableDist = ChartableDistribution;

export default function NewChartPage() {
  const router = useRouter();

  const [distributions, setDistributions] = useState<ChartableDist[]>([]);
  const [loadingDists, setLoadingDists] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [distributionId, setDistributionId] = useState("");
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [xColumn, setXColumn] = useState("");
  const [yColumns, setYColumns] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  useEffect(() => {
    listChartableDistributions().then((dists) => {
      setDistributions(dists);
      setLoadingDists(false);
    });
  }, []);

  async function handleDistributionChange(distId: string) {
    setDistributionId(distId);
    setColumns([]);
    setXColumn("");
    setYColumns([]);
    setData([]);
    setError(null);
    if (!distId) return;

    setLoadingColumns(true);
    try {
      const res = await fetch(`/api/datastore/${distId}?limit=0`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Failed to load columns (${res.status})`);
        return;
      }
      const json = await res.json();
      if (json.columns?.length) {
        setColumns(json.columns);
        setXColumn(json.columns[0]?.name || "");
      } else {
        setError("No columns found in this datastore");
      }
    } catch {
      setError("Failed to load columns");
    } finally {
      setLoadingColumns(false);
    }
  }

  const numericColumns = columns.filter(
    (c) => c.type === "INTEGER" || c.type === "REAL"
  );

  function toggleYColumn(col: string) {
    setYColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  async function handlePreview() {
    if (!distributionId) return;
    setError(null);
    try {
      const res = await fetch(`/api/datastore/${distributionId}?limit=1000`);
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      setData(json.records || []);
    } catch {
      setError("Failed to load preview data");
    }
  }

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      await createChart({
        distributionId,
        title: title || undefined,
        chartType: chartType as "bar" | "line" | "pie" | "scatter",
        config: { xColumn, yColumns },
      });
      router.push("/admin/charts");
    } catch {
      setError("Failed to create chart");
    } finally {
      setSaving(false);
    }
  }

  if (loadingDists) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-surface-alt" />
        <div className="h-64 rounded bg-surface-alt" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Charts", href: "/admin/charts" },
          { label: "New Chart" },
        ]}
      />
      <AdminPageHeader title="New Chart" />

      {distributions.length === 0 ? (
        <p className="text-text-muted">
          No chartable distributions found. Import a CSV into a datastore first.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Config form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Distribution</Label>
              <DistributionPicker
                distributions={distributions}
                value={distributionId}
                onChange={handleDistributionChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chart title (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chartType">Chart Type</Label>
              <NativeSelect
                id="chartType"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                {chartTypeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            {loadingColumns && (
              <p className="text-sm text-text-muted">Loading columns...</p>
            )}

            {columns.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="xColumn">X Axis</Label>
                  <NativeSelect
                    id="xColumn"
                    value={xColumn}
                    onChange={(e) => setXColumn(e.target.value)}
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <Label>Y Axis (numeric columns)</Label>
                  <div className="flex flex-wrap gap-2">
                    {numericColumns.map((c) => (
                      <label
                        key={c.name}
                        className="flex items-center gap-1 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={yColumns.includes(c.name)}
                          onChange={() => toggleYColumn(c.name)}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handlePreview}
                variant="outline"
                disabled={!xColumn || yColumns.length === 0}
              >
                Preview
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={
                  saving || !distributionId || !xColumn || yColumns.length === 0
                }
              >
                {saving ? "Creating..." : "Create Chart"}
              </Button>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          {/* Live preview */}
          <div className="rounded border border-border p-4">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            {data.length > 0 ? (
              <ChartRenderer
                chartType={chartType}
                data={data}
                xColumn={xColumn}
                yColumns={yColumns}
              />
            ) : (
              <p className="text-sm text-text-muted">
                Select a distribution and configure columns, then click Preview.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
