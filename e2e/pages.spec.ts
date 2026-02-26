import { test, expect } from "@playwright/test";

test.describe("Content Pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("admin can create a page", async ({ page }) => {
    await page.goto("/admin/pages/new");

    await page.getByLabel("Title", { exact: true }).fill("E2E About Page");
    await page.locator("textarea").first().fill("# About Us\n\nThis is a test page.");
    await page.getByLabel(/published/i).check();

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/pages/, { timeout: 10000 });

    // Verify it appears in the list
    await expect(page.getByText("E2E About Page")).toBeVisible();
  });

  test("published page renders at /pages/slug", async ({ page }) => {
    // Create a published page first
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Public Page");
    await page.locator("textarea").first().fill("# Public Content\n\nVisible to everyone.");
    await page.getByLabel(/published/i).check();
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/pages/, { timeout: 10000 });

    // Visit the public page
    await page.goto("/pages/e2e-public-page");
    await expect(page.getByText("Public Content")).toBeVisible();
  });

  test("navigation includes published pages", async ({ page }) => {
    // Create a published page
    await page.goto("/admin/pages/new");
    await page.getByLabel("Title", { exact: true }).fill("E2E Nav Page");
    await page.locator("textarea").first().fill("Nav test content");
    await page.getByLabel(/published/i).check();
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/pages/, { timeout: 10000 });

    // Check public nav — use a fresh page load to avoid server component caching
    await page.goto("/datasets");
    await page.waitForLoadState("networkidle");
    // The nav should contain a link to the page
    await expect(
      page.getByRole("navigation", { name: /main/i }).getByRole("link", { name: "E2E Nav Page" })
    ).toBeVisible({ timeout: 10000 });
  });
});
