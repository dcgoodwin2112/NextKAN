"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getChart, updateChart } from "@/lib/actions/charts";
import { ChartRenderer } from "@/components/visualizations/ChartRenderer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ChartDeleteButton } from "../../ChartDeleteButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { ChartConfig } from "@/lib/schemas/chart";

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

interface ChartData {
  chart: {
    id: string;
    title: string | null;
    chartType: string;
    config: ChartConfig;
  };
  data: Record<string, unknown>[];
}

export default function EditChartPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [xColumn, setXColumn] = useState("");
  const [yColumns, setYColumns] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [chartId, setChartId] = useState("");
  const [distributionId, setDistributionId] = useState("");

  const loadChart = useCallback(async () => {
    try {
      // Fetch chart data + records from API
      const res = await fetch(`/api/charts/${params.id}`);
      if (!res.ok) throw new Error("Chart not found");
      const json: ChartData = await res.json();

      setChartId(json.chart.id);
      setTitle(json.chart.title || "");
      setChartType(json.chart.chartType);
      setXColumn(json.chart.config.xColumn);
      setYColumns(json.chart.config.yColumns);
      setData(json.data);

      // Get distribution ID from server action for column loading
      const chart = await getChart(params.id);
      if (chart) {
        setDistributionId(chart.distributionId);

        // Load columns from datastore
        const colRes = await fetch(
          `/api/datastore/${chart.distributionId}?limit=0`
        );
        if (!colRes.ok) {
          const body = await colRes.json().catch(() => ({}));
          setError(body.error || `Failed to load columns (${colRes.status})`);
        } else {
          const colJson = await colRes.json();
          if (colJson.columns?.length) {
            setColumns(colJson.columns);
          } else {
            setError("No columns found in this datastore");
          }
        }
      }
    } catch {
      setError("Failed to load chart");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

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
    try {
      const res = await fetch(`/api/datastore/${distributionId}?limit=1000`);
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      setData(json.records || []);
    } catch {
      setError("Failed to load preview data");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateChart(chartId, {
        title: title || undefined,
        chartType: chartType as "bar" | "line" | "pie" | "scatter",
        config: { xColumn, yColumns },
      });
      router.push("/admin/charts");
    } catch {
      setError("Failed to save chart");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-surface-alt" />
        <div className="h-64 rounded bg-surface-alt" />
      </div>
    );
  }

  if (error && !chartId) {
    return <p className="text-danger">{error}</p>;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Charts", href: "/admin/charts" },
          { label: "Edit Chart" },
        ]}
      />
      <AdminPageHeader title={title || "Untitled Chart"}>
        <ChartDeleteButton chartId={chartId} />
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Config form */}
        <div className="space-y-4">
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
              Refresh Preview
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !xColumn || yColumns.length === 0}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {/* Embed code */}
          {chartId && (
            <div className="rounded border border-border p-3">
              <p className="text-sm font-medium mb-1">Embed Code</p>
              <code className="block text-xs text-text-muted break-all bg-surface-alt rounded p-2">
                {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/chart/${chartId}" width="800" height="500"></iframe>`}
              </code>
            </div>
          )}
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
              No preview data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
