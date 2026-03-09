import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("search returns matching datasets", async ({ page }) => {
    await page.goto("/datasets");
    await page.getByRole("searchbox", { name: /search/i }).fill("E2E Published");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/search=E2E/);
    await expect(page.getByText("E2E Published Dataset")).toBeVisible();
  });

  test("no results shows empty state", async ({ page }) => {
    await page.goto("/datasets?search=zzzznonexistent");
    await expect(page.getByText(/no datasets found/i)).toBeVisible();
  });

  test("search preserves query in URL", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: /search/i }).fill("testing");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page).toHaveURL(/search=testing/);
    // Search input should preserve the query
    await expect(
      page.getByRole("searchbox", { name: /search/i })
    ).toHaveValue("testing");
  });
});
