import type { DatasetWithRelations } from "@/lib/schemas/dcat-us";

export interface QualityBreakdown {
  category: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface QualityScore {
  overall: number;
  breakdown: QualityBreakdown[];
  suggestions: string[];
}

interface QualityCheck {
  category: string;
  maxScore: number;
  evaluate: (dataset: DatasetWithRelations) => { score: number; details: string };
}

const QUALITY_CHECKS: QualityCheck[] = [
  {
    category: "Title",
    maxScore: 5,
    evaluate: (d) => {
      if (!d.title) return { score: 0, details: "Missing title" };
      if (d.title.length > 10) return { score: 5, details: "Descriptive title present" };
      return { score: 2, details: "Title is too short (should be >10 characters)" };
    },
  },
  {
    category: "Description",
    maxScore: 10,
    evaluate: (d) => {
      if (!d.description) return { score: 0, details: "Missing description" };
      if (d.description.length > 50) return { score: 10, details: "Detailed description present" };
      return { score: 5, details: "Description is brief (should be >50 characters)" };
    },
  },
  {
    category: "Keywords",
    maxScore: 10,
    evaluate: (d) => {
      const count = d.keywords.length;
      if (count >= 3) return { score: 10, details: `${count} keywords assigned` };
      if (count > 0) return { score: 5, details: `Only ${count} keyword(s) — recommend at least 3` };
      return { score: 0, details: "No keywords assigned" };
    },
  },
  {
    category: "Contact Point",
    maxScore: 10,
    evaluate: (d) => {
      const hasName = !!d.contactName;
      const hasEmail = !!d.contactEmail;
      if (hasName && hasEmail) return { score: 10, details: "Contact name and email present" };
      if (hasName || hasEmail) return { score: 5, details: "Contact partially complete" };
      return { score: 0, details: "Missing contact information" };
    },
  },
  {
    category: "License",
    maxScore: 10,
    evaluate: (d) => {
      if (d.license) return { score: 10, details: "License specified" };
      return { score: 0, details: "No license specified" };
    },
  },
  {
    category: "Distributions",
    maxScore: 10,
    evaluate: (d) => {
      if (d.distributions.length > 0) return { score: 10, details: `${d.distributions.length} distribution(s) available` };
      return { score: 0, details: "No distributions attached" };
    },
  },
  {
    category: "Distribution Media Types",
    maxScore: 5,
    evaluate: (d) => {
      if (d.distributions.length === 0) return { score: 0, details: "No distributions to evaluate" };
      const withType = d.distributions.filter((dist) => !!dist.mediaType).length;
      if (withType === d.distributions.length) return { score: 5, details: "All distributions have media types" };
      if (withType > 0) return { score: 3, details: `${withType}/${d.distributions.length} distributions have media types` };
      return { score: 0, details: "No distributions have media types" };
    },
  },
  {
    category: "Temporal Coverage",
    maxScore: 5,
    evaluate: (d) => {
      if (d.temporal) return { score: 5, details: "Temporal coverage specified" };
      return { score: 0, details: "No temporal coverage" };
    },
  },
  {
    category: "Spatial Coverage",
    maxScore: 5,
    evaluate: (d) => {
      if (d.spatial) return { score: 5, details: "Spatial coverage specified" };
      return { score: 0, details: "No spatial coverage" };
    },
  },
  {
    category: "Update Frequency",
    maxScore: 5,
    evaluate: (d) => {
      if (d.accrualPeriodicity) return { score: 5, details: "Update frequency specified" };
      return { score: 0, details: "No update frequency" };
    },
  },
  {
    category: "Data Dictionary",
    maxScore: 10,
    evaluate: (d) => {
      if (d.describedBy) return { score: 10, details: "Data dictionary URL provided" };
      return { score: 0, details: "No data dictionary reference" };
    },
  },
  {
    category: "Landing Page",
    maxScore: 5,
    evaluate: (d) => {
      if (d.landingPage) return { score: 5, details: "Landing page URL provided" };
      return { score: 0, details: "No landing page URL" };
    },
  },
  {
    category: "Conforms To",
    maxScore: 5,
    evaluate: (d) => {
      if (d.conformsTo) return { score: 5, details: "Data standard reference provided" };
      return { score: 0, details: "No data standard reference" };
    },
  },
  {
    category: "Themes",
    maxScore: 5,
    evaluate: (d) => {
      if (d.themes?.length > 0) return { score: 5, details: `${d.themes.length} theme(s) assigned` };
      return { score: 0, details: "No themes assigned" };
    },
  },
];

export function calculateQualityScore(dataset: DatasetWithRelations): QualityScore {
  const breakdown: QualityBreakdown[] = [];
  const suggestions: string[] = [];

  for (const check of QUALITY_CHECKS) {
    const { score, details } = check.evaluate(dataset);
    breakdown.push({
      category: check.category,
      score,
      maxScore: check.maxScore,
      details,
    });
    if (score < check.maxScore) {
      suggestions.push(details);
    }
  }

  const overall = breakdown.reduce((sum, b) => sum + b.score, 0);
  return { overall, breakdown, suggestions };
}

export function getQualityTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Gold", color: "text-yellow-600" };
  if (score >= 60) return { label: "Silver", color: "text-gray-500" };
  if (score >= 40) return { label: "Bronze", color: "text-amber-700" };
  return { label: "Needs Improvement", color: "text-red-600" };
}
