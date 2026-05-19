/**
 * Regex-based PII heuristics. A column is PII-flagged when more than half of
 * its non-null sample values match a PII pattern. False positives are tolerable;
 * the admin can override the flag manually.
 */

const SSN = /^\d{3}-\d{2}-\d{4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// US phone: optional area-code parens, separators ., -, space, or none.
const US_PHONE = /^\(?\d{3}\)?[-.\s]*\d{3}[-.\s]*\d{4}$/;

const PATTERNS = [SSN, EMAIL, US_PHONE];

/**
 * True iff more than half of the non-null samples match a known PII pattern.
 * Non-string samples are coerced via String(). Empty input returns false.
 */
export function detectPii(samples: unknown[]): boolean {
  let total = 0;
  let hits = 0;
  for (const raw of samples) {
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (value === "") continue;
    total += 1;
    if (PATTERNS.some((re) => re.test(value))) hits += 1;
  }
  if (total === 0) return false;
  return hits / total > 0.5;
}
