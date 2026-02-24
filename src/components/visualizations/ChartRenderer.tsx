"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#e11d48",
  "#65a30d",
];

interface ChartRendererProps {
  chartType: string;
  data: Record<string, unknown>[];
  xColumn: string;
  yColumns: string[];
}

export function ChartRenderer({
  chartType,
  data,
  xColumn,
  yColumns,
}: ChartRendererProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No data to display.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      {chartType === "bar" ? (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yColumns.map((col, i) => (
            <Bar
              key={col}
              dataKey={col}
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </BarChart>
      ) : chartType === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yColumns.map((col, i) => (
            <Line
              key={col}
              type="monotone"
              dataKey={col}
              stroke={COLORS[i % COLORS.length]}
            />
          ))}
        </LineChart>
      ) : chartType === "pie" ? (
        <PieChart>
          <Pie
            data={data}
            dataKey={yColumns[0]}
            nameKey={xColumn}
            cx="50%"
            cy="50%"
            outerRadius={150}
            label
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      ) : (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xColumn} name={xColumn} />
          <YAxis dataKey={yColumns[0]} name={yColumns[0]} />
          <Tooltip />
          <Scatter data={data} fill={COLORS[0]} />
        </ScatterChart>
      )}
    </ResponsiveContainer>
  );
}
