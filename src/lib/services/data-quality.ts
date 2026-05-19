import type { DatasetWithRelations, DistributionWithDictionary } from "@/lib/schemas/dcat-us";
import { detectPii } from "@/lib/profiling/pii";

export interface QualityBreakdown {
  category: string;
  score: number;
  maxScore: number;
  details: string;
}

export interface QualityScore {
  overall: number;
  maxScore: number;
  breakdown: QualityBreakdown[];
  suggestions: string[];
}

interface QualityCheck {
  category: string;
  maxScore: number;
  /** If provided and returns false for a dataset, the check is skipped (not counted in max). */
  applicable?: (dataset: DatasetWithRelations) => boolean;
  evaluate: (dataset: DatasetWithRelations) => { score: number; details: string };
}

function hasProfiledColumns(dataset: DatasetWithRelations): boolean {
  return dataset.distributions.some((dist) => (dist.dataDictionary?.fields?.length ?? 0) > 0);
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
  {
    category: "Agent: Column Documentation",
    maxScore: 5,
    applicable: hasProfiledColumns,
    evaluate: (d) => {
      const fields = collectDictionaryFields(d);
      const documented = fields.filter(
        (f) => (f.description ?? "").trim().length > 0 && hasUnit(f),
      ).length;
      if (documented === fields.length) {
        return { score: 5, details: "All columns have description and unit" };
      }
      const ratio = documented / fields.length;
      const score = Math.round(ratio * 5);
      return {
        score,
        details: `${documented}/${fields.length} columns have both description and unit`,
      };
    },
  },
  {
    category: "Agent: Filterable Documentation",
    maxScore: 5,
    applicable: hasProfiledColumns,
    evaluate: (d) => {
      const fields = collectDictionaryFields(d);
      const filterable = fields.filter((f) => f.filterable);
      if (filterable.length === 0) {
        return { score: 5, details: "N/A — no filterable columns" };
      }
      const documented = filterable.filter(
        (f) => (f.description ?? "").trim().length > 0,
      ).length;
      if (documented === filterable.length) {
        return { score: 5, details: "All filterable columns have descriptions" };
      }
      const ratio = documented / filterable.length;
      const score = Math.round(ratio * 5);
      return {
        score,
        details: `${documented}/${filterable.length} filterable columns have descriptions`,
      };
    },
  },
  {
    category: "Agent: PII Safety",
    maxScore: 5,
    applicable: hasProfiledColumns,
    evaluate: (d) => {
      const fields = collectDictionaryFields(d);
      const unflagged: string[] = [];
      const flagged: string[] = [];
      for (const f of fields) {
        const samples = parseJsonArray(f.sampleValues);
        const detected = samples.length > 0 && detectPii(samples);
        if (detected && !f.isPii) unflagged.push(f.name);
        if (f.isPii) flagged.push(f.name);
      }
      if (unflagged.length > 0) {
        return {
          score: 0,
          details: `PII detected but not flagged: ${unflagged.join(", ")}`,
        };
      }
      if (flagged.length > 0) {
        return {
          score: 3,
          details: `${flagged.length} PII column(s) flagged correctly`,
        };
      }
      return { score: 5, details: "No PII detected" };
    },
  },
];

export function calculateQualityScore(dataset: DatasetWithRelations): QualityScore {
  const breakdown: QualityBreakdown[] = [];
  const suggestions: string[] = [];

  for (const check of QUALITY_CHECKS) {
    if (check.applicable && !check.applicable(dataset)) continue;
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
  const maxScore = breakdown.reduce((sum, b) => sum + b.maxScore, 0);
  return { overall, maxScore, breakdown, suggestions };
}

/**
 * Returns a letter tier from a percentage in 0-100. Callers that have a raw
 * score should divide by `QualityScore.maxScore` first.
 */
export function getQualityTier(percent: number): { label: string; color: string } {
  if (percent >= 90) return { label: "A", color: "text-success-text" };
  if (percent >= 80) return { label: "B", color: "text-primary" };
  if (percent >= 70) return { label: "C", color: "text-warning-text" };
  if (percent >= 60) return { label: "D", color: "text-warning-text" };
  return { label: "F", color: "text-danger-text" };
}

type DictionaryField = NonNullable<DistributionWithDictionary["dataDictionary"]>["fields"][number];

function collectDictionaryFields(dataset: DatasetWithRelations): DictionaryField[] {
  const out: DictionaryField[] = [];
  for (const dist of dataset.distributions) {
    const dict = dist.dataDictionary;
    if (!dict?.fields?.length) continue;
    for (const f of dict.fields) out.push(f);
  }
  return out;
}

const UNIT_PATTERN = /\(unit:\s*[^)]+\)/i;

function hasUnit(field: { description: string | null; extensions: string | null }): boolean {
  if (field.description && UNIT_PATTERN.test(field.description)) return true;
  if (field.extensions) {
    try {
      const parsed = JSON.parse(field.extensions);
      if (parsed && typeof parsed === "object" && "unit" in parsed) {
        const v = (parsed as Record<string, unknown>).unit;
        if (typeof v === "string" && v.trim().length > 0) return true;
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return false;
}

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
