"use client";

import { getQualityTier } from "@/lib/services/data-quality";

interface QualityBadgeProps {
  score: number;
  showScore?: boolean;
}

export function QualityBadge({ score, showScore = true }: QualityBadgeProps) {
  const tier = getQualityTier(score);

  const bgColors: Record<string, string> = {
    Gold: "bg-warning-subtle border-warning",
    Silver: "bg-surface-alt border-border",
    Bronze: "bg-warning-subtle border-warning",
    "Needs Improvement": "bg-danger-subtle border-danger",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${bgColors[tier.label] || ""} ${tier.color}`}
      title={`Data quality: ${score}/100`}
    >
      {tier.label === "Gold" && <span aria-hidden="true">★</span>}
      {tier.label}
      {showScore && <span className="text-text-muted">({score})</span>}
    </span>
  );
}
