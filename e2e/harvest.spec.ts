import { test, expect } from "@playwright/test";

test.describe("Harvest", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("admin can create a harvest source", async ({ page }) => {
    await page.goto("/admin/harvest/new");

    await page.getByLabel(/name/i).fill("E2E Test Source");
    await page.getByLabel(/url/i).fill("http://localhost:3001/api/test/fixture-catalog");
    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL(/\/admin\/harvest/, { timeout: 10000 });
    await expect(page.getByText("E2E Test Source")).toBeVisible();
  });

  test("admin can view harvest source details", async ({ page }) => {
    // Create source first
    await page.goto("/admin/harvest/new");
    await page.getByLabel(/name/i).fill("E2E Detail Source");
    await page.getByLabel(/url/i).fill("http://localhost:3001/api/test/fixture-catalog");
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/harvest/, { timeout: 10000 });

    // Click to view details
    await page.getByText("Manage").first().click();
    await expect(page.getByText("E2E Detail Source")).toBeVisible();
    await expect(page.getByText("Run Now")).toBeVisible();
  });

  test("harvest source list shows on admin page", async ({ page }) => {
    await page.goto("/admin/harvest");
    await expect(page.getByText("Harvest Sources")).toBeVisible();
  });
});
