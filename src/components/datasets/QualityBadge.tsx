"use client";

import { getQualityTier } from "@/lib/services/data-quality";

interface QualityBadgeProps {
  score: number;
  showScore?: boolean;
}

const bgColors: Record<string, string> = {
  A: "bg-success-subtle border-success",
  B: "bg-primary-subtle border-primary",
  C: "bg-warning-subtle border-warning",
  D: "bg-warning-subtle border-warning",
  F: "bg-danger-subtle border-danger",
};

export function QualityBadge({ score, showScore = true }: QualityBadgeProps) {
  const tier = getQualityTier(score);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${bgColors[tier.label] || ""} ${tier.color}`}
      title={`Data quality: ${score}/100 (${tier.label})`}
    >
      {tier.label}
      {showScore && <span className="text-text-muted">({score}%)</span>}
    </span>
  );
}
