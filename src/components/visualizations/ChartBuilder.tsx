"use client";

import { useState, useEffect, useCallback } from "react";
import { ChartRenderer } from "./ChartRenderer";

const chartTypes = [
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "scatter", label: "Scatter Plot" },
];

interface ChartBuilderProps {
  distributionId: string;
}

interface ColumnInfo {
  name: string;
  type: string;
}

export function ChartBuilder({ distributionId }: ChartBuilderProps) {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [chartType, setChartType] = useState("bar");
  const [xColumn, setXColumn] = useState("");
  const [yColumns, setYColumns] = useState<string[]>([]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [title, setTitle] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load columns from datastore
  useEffect(() => {
    async function loadColumns() {
      setError(null);
      try {
        const res = await fetch(
          `/api/datastore/${distributionId}?limit=0`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || `Failed to load columns (${res.status})`);
          return;
        }
        const json = await res.json();
        if (json.columns?.length) {
          setColumns(json.columns);
          setXColumn(json.columns[0].name);
          const numericCols = json.columns.filter(
            (c: ColumnInfo) =>
              c.type === "INTEGER" || c.type === "REAL"
          );
          if (numericCols.length > 0) {
            setYColumns([numericCols[0].name]);
          }
        } else {
          setError("No columns found in this datastore");
        }
      } catch {
        setError("Failed to load columns");
      }
    }
    loadColumns();
  }, [distributionId]);

  const numericColumns = columns.filter(
    (c) => c.type === "INTEGER" || c.type === "REAL"
  );

  // Load preview data
  const loadPreview = useCallback(async () => {
    if (!xColumn || yColumns.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/datastore/${distributionId}?limit=1000`
      );
      if (!res.ok) throw new Error("Failed to load data");
      const json = await res.json();
      setData(json.records || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [distributionId, xColumn, yColumns]);

  async function handleSave() {
    try {
      const res = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributionId,
          title: title || undefined,
          chartType,
          config: { xColumn, yColumns },
        }),
      });
      if (!res.ok) throw new Error("Failed to save chart");
      const chart = await res.json();
      setSavedId(chart.id);
    } catch {
      setError("Failed to save chart");
    }
  }

  function toggleYColumn(col: string) {
    setYColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  }

  return (
    <div className="space-y-4 rounded border border-border p-4">
      <h3 className="font-semibold">Chart Builder</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Chart Type
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            {chartTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary">
            X Axis
          </label>
          <select
            value={xColumn}
            onChange={(e) => setXColumn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Y Axis (numeric columns)
        </label>
        <div className="flex flex-wrap gap-2">
          {numericColumns.map((c) => (
            <label key={c.name} className="flex items-center gap-1 text-sm">
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading || !xColumn || yColumns.length === 0}
          className="rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? "Loading..." : "Preview"}
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chart title (optional)"
          className="rounded border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={data.length === 0}
          className="rounded border border-primary px-4 py-2 text-sm text-primary hover:bg-primary-subtle disabled:opacity-50"
        >
          Save
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {data.length > 0 && (
        <ChartRenderer
          chartType={chartType}
          data={data}
          xColumn={xColumn}
          yColumns={yColumns}
        />
      )}

      {savedId && (
        <div className="rounded bg-success-subtle p-3 text-sm">
          <p className="font-medium text-success-text">Chart saved!</p>
          <p className="mt-1 text-success-text">
            Embed code:{" "}
            <code className="rounded bg-surface-alt px-1">
              {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/chart/${savedId}" width="800" height="500"></iframe>`}
            </code>
          </p>
        </div>
      )}
    </div>
  );
}
