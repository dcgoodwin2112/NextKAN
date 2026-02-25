import { prisma } from "@/lib/db";
import { calculateQualityScore } from "@/lib/services/data-quality";
import { QualityBadge } from "@/components/datasets/QualityBadge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Total Datasets</p>
          <p className="text-2xl font-bold">{scored.length}</p>
        </div>
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Average Quality Score</p>
          <p className="text-2xl font-bold">{avgScore}/100</p>
        </div>
        <div className="rounded border p-4 bg-background">
          <p className="text-sm text-text-muted">Most Common Gap</p>
          <p className="text-2xl font-bold">{topMissing[0]?.[0] || "None"}</p>
        </div>
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

      <div className="rounded border bg-background overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Dataset</th>
              <th className="text-left px-4 py-3 font-medium">Publisher</th>
              <th className="text-left px-4 py-3 font-medium">Score</th>
              <th className="text-left px-4 py-3 font-medium">Quality</th>
              <th className="text-left px-4 py-3 font-medium">Top Suggestion</th>
            </tr>
          </thead>
          <tbody>
            {scored.map(({ dataset, quality }) => (
              <tr key={dataset.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/datasets/${dataset.id}/edit`} className="text-primary hover:underline">
                    {dataset.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-tertiary">{dataset.publisher.name}</td>
                <td className="px-4 py-3 font-mono">{quality.overall}/100</td>
                <td className="px-4 py-3">
                  <QualityBadge score={quality.overall} showScore={false} />
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">
                  {quality.suggestions[0] || "Complete"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
