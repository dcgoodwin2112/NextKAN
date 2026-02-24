import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("homepage loads and shows recent datasets", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("Recent Datasets")).toBeVisible();
    await expect(page.getByText("E2E Published Dataset")).toBeVisible();
  });

  test("/datasets listing shows published datasets", async ({ page }) => {
    await page.goto("/datasets");
    await expect(page.locator("h1")).toContainText("Datasets");
    await expect(page.getByText("E2E Published Dataset")).toBeVisible();
    await expect(page.getByText(/dataset.*found/i)).toBeVisible();
  });

  test("dataset detail displays full metadata", async ({ page }) => {
    await page.goto("/datasets/e2e-published-dataset");
    await expect(page.locator("h1")).toContainText("E2E Published Dataset");
    await expect(page.getByText("E2E Test Agency")).toBeVisible();
    await expect(page.getByText("e2e", { exact: true })).toBeVisible();
    await expect(page.getByText("testing", { exact: true })).toBeVisible();
  });

  test("dataset detail shows distributions with download links", async ({
    page,
  }) => {
    await page.goto("/datasets/e2e-published-dataset");
    await expect(page.getByText("CSV Download")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /example\.com\/data\.csv/ })
    ).toBeVisible();
  });

  test("organization listing shows orgs with dataset counts", async ({
    page,
  }) => {
    await page.goto("/organizations");
    await expect(page.locator("h1")).toContainText("Organizations");
    await expect(page.getByText("E2E Test Agency")).toBeVisible();
  });

  test("organization detail shows org's datasets", async ({ page }) => {
    await page.goto("/organizations/e2e-test-agency");
    await expect(page.locator("h1")).toContainText("E2E Test Agency");
    await expect(page.getByText("E2E Published Dataset")).toBeVisible();
  });

  test("404 for non-existent dataset slug", async ({ page }) => {
    const response = await page.goto("/datasets/does-not-exist-slug");
    expect(response?.status()).toBe(404);
  });
});
