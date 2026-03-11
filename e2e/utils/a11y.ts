import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const DEFAULT_DISABLED_RULES: string[] = [];

export async function scanPageA11y(
  page: Page,
  options?: { disableRules?: string[] }
) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules([...DEFAULT_DISABLED_RULES, ...(options?.disableRules ?? [])])
    .analyze();
}
