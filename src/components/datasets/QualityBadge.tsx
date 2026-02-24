"use client";

import { getQualityTier } from "@/lib/services/data-quality";

interface QualityBadgeProps {
  score: number;
  showScore?: boolean;
}

export function QualityBadge({ score, showScore = true }: QualityBadgeProps) {
  const tier = getQualityTier(score);

  const bgColors: Record<string, string> = {
    Gold: "bg-yellow-100 border-yellow-300",
    Silver: "bg-gray-100 border-gray-300",
    Bronze: "bg-amber-100 border-amber-300",
    "Needs Improvement": "bg-red-100 border-red-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${bgColors[tier.label] || ""} ${tier.color}`}
      title={`Data quality: ${score}/100`}
    >
      {tier.label === "Gold" && <span aria-hidden="true">★</span>}
      {tier.label}
      {showScore && <span className="text-gray-500">({score})</span>}
    </span>
  );
}
