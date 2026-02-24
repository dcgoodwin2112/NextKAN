"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChartRenderer } from "@/components/visualizations/ChartRenderer";

export default function EmbedChartPage() {
  const params = useParams();
  const [chart, setChart] = useState<{
    chartType: string;
    config: { xColumn: string; yColumns: string[] };
    title?: string;
  } | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/charts/${params.id}`);
        if (!res.ok) throw new Error("Chart not found");
        const json = await res.json();
        setChart(json.chart);
        setData(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load chart");
      }
    }
    load();
  }, [params.id]);

  if (error) return <p style={{ color: "red", padding: 16 }}>{error}</p>;
  if (!chart) return <p style={{ padding: 16 }}>Loading chart...</p>;

  return (
    <div style={{ padding: 16 }}>
      {chart.title && (
        <h2 style={{ marginBottom: 12, fontSize: 18, fontWeight: 600 }}>
          {chart.title}
        </h2>
      )}
      <ChartRenderer
        chartType={chart.chartType}
        data={data}
        xColumn={chart.config.xColumn}
        yColumns={chart.config.yColumns}
      />
    </div>
  );
}
