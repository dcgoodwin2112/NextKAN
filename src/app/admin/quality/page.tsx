import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";
import Link from "next/link";

const datasetIncludes = {
  publisher: { include: { parent: true } },
  distributions: true,
  keywords: true,
  themes: { include: { theme: true } },
} as const;

export default async function QualityReportPage() {
  const datasets = await prisma.dataset.findMany({
    include: datasetIncludes,
    orderBy: { title: "asc" },
  });

  const scored = datasets.map((d) => ({
    dataset: d,
    quality: calculateQualityScore(d as unknown as DatasetWithRelations),
  }));

  // Sort by score ascending (worst first)
  scored.sort((a, b) => a.quality.overall - b.quality.overall);

  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.quality.overall, 0) / scored.length)
      : 0;

  // Count most common missing categories
  const missingCounts: Record<string, number> = {};
  for (const s of scored) {
    for (const b of s.quality.breakdown) {
      if (b.score < b.maxScore) {
        missingCounts[b.category] = (missingCounts[b.category] || 0) + 1;
      }
    }
  }
  const topMissing = Object.entries(missingCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div>
      <AdminPageHeader title="Data Quality Report" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Total Datasets</p>
            <p className="text-2xl font-bold">{scored.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Average Quality Score</p>
            <p className="text-2xl font-bold">{avgScore}/100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-text-muted">Most Common Gap</p>
            <p className="text-2xl font-bold">{topMissing[0]?.[0] || "None"}</p>
          </CardContent>
        </Card>
      </div>

      {topMissing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Most Common Missing Fields</h2>
          <div className="flex flex-wrap gap-2">
            {topMissing.map(([field, count]) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 rounded bg-surface-alt px-3 py-1 text-sm"
              >
                {field} <span className="text-text-muted">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dataset</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Quality</TableHead>
            <TableHead>Top Suggestion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scored.map(({ dataset, quality }) => (
            <TableRow key={dataset.id}>
              <TableCell>
                <Link href={`/admin/datasets/${dataset.id}/edit`} className="text-primary hover:underline">
                  {dataset.title}
                </Link>
              </TableCell>
              <TableCell className="text-text-tertiary">{dataset.publisher.name}</TableCell>
              <TableCell className="font-mono">{quality.overall}/100</TableCell>
              <TableCell>
                <QualityBadge score={quality.overall} showScore={false} />
              </TableCell>
              <TableCell className="text-text-muted text-xs">
                {quality.suggestions[0] || "Complete"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
