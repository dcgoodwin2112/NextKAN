import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search returns matching datasets", async ({ page }) => {
    await page.goto("/datasets");
    // Scope to main content to avoid header search
    const main = page.locator("main");
    await main.getByRole("searchbox", { name: /search/i }).fill("E2E Published");
    await main.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/search=E2E/);
    await expect(page.getByText("E2E Published Dataset")).toBeVisible();
  });

  test("no results shows empty state", async ({ page }) => {
    await page.goto("/datasets?search=zzzznonexistent");
    await expect(page.getByText(/no datasets found/i)).toBeVisible();
  });

  test("search preserves query in URL", async ({ page }) => {
    await page.goto("/");
    // Use the hero search bar (main content area), not the header one
    const main = page.locator("main");
    await main.getByRole("searchbox", { name: /search/i }).fill("testing");
    await main.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/search=testing/);
    // Search input on datasets page should preserve the query
    await expect(
      main.getByRole("searchbox", { name: /search/i })
    ).toHaveValue("testing");
  });
});
