"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardLineChartProps {
  data: { date: string; views: number; downloads: number }[];
}

export function DashboardLineChart({ data }: DashboardLineChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-text-muted">No activity data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="views" stroke="#2563eb" name="Views" />
        <Line type="monotone" dataKey="downloads" stroke="#16a34a" name="Downloads" />
      </LineChart>
    </ResponsiveContainer>
  );
}
