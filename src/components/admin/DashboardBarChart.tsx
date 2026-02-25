"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DashboardBarChartProps {
  data: { month: string; count: number }[];
}

export function DashboardBarChart({ data }: DashboardBarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No publishing data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#2563eb" name="Datasets Published" />
      </BarChart>
    </ResponsiveContainer>
  );
}
