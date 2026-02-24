import { z } from "zod";

export const chartTypes = ["bar", "line", "pie", "scatter"] as const;

export const chartConfigSchema = z.object({
  xColumn: z.string().min(1),
  yColumns: z.array(z.string().min(1)).min(1),
  groupBy: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export type ChartConfig = z.infer<typeof chartConfigSchema>;

export const savedChartCreateSchema = z.object({
  distributionId: z.string().min(1),
  title: z.string().optional(),
  chartType: z.enum(chartTypes),
  config: chartConfigSchema,
});

export type SavedChartCreateInput = z.infer<typeof savedChartCreateSchema>;
