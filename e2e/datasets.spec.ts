import { test, expect } from "@playwright/test";

test.describe("Dataset admin workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("admin can create a dataset", async ({ page }) => {
    await page.goto("/admin/datasets/new");

    await page.getByLabel(/title/i).fill("E2E Created Dataset");
    await page.getByLabel(/description/i).fill("Created via E2E test");
    await page
      .getByLabel(/publisher/i)
      .selectOption({ label: "E2E Test Agency" });

    const keywordInput = page.getByLabel(/keywords/i);
    await keywordInput.fill("automated");
    await keywordInput.press("Enter");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });
  });

  test("admin can edit an existing dataset", async ({ page }) => {
    // Create a new dataset to edit (don't modify seeded data)
    await page.goto("/admin/datasets/new");
    await page.getByLabel(/title/i).fill("E2E Edit Target");
    await page.getByLabel(/description/i).fill("Will be edited");
    await page
      .getByLabel(/publisher/i)
      .selectOption({ label: "E2E Test Agency" });

    const keywordInput = page.getByLabel(/keywords/i);
    await keywordInput.fill("editable");
    await keywordInput.press("Enter");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });

    // Navigate to admin datasets and edit the created dataset
    await page.goto("/admin/datasets");
    await page.waitForLoadState("networkidle");
    await page.getByText("E2E Edit Target").first().click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });

    const titleInput = page.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill("E2E Edited Dataset");
    await page.getByRole("button", { name: /update/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });
  });

  test("admin can delete a dataset", async ({ page }) => {
    // Create a dataset to delete
    await page.goto("/admin/datasets/new");
    await page.getByLabel(/title/i).fill("E2E Delete Target");
    await page.getByLabel(/description/i).fill("To be deleted");
    await page
      .getByLabel(/publisher/i)
      .selectOption({ label: "E2E Test Agency" });

    const keywordInput = page.getByLabel(/keywords/i);
    await keywordInput.fill("delete");
    await keywordInput.press("Enter");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });

    // Navigate to datasets list and click into the dataset to edit
    await page.goto("/admin/datasets");
    await page.waitForLoadState("networkidle");
    await page.getByText("E2E Delete Target").first().click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });

    // Delete — use exact match to avoid matching "Remove keyword delete" button
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });
  });

  test("created dataset appears on public listing when published", async ({
    page,
  }) => {
    await page.goto("/datasets");
    await expect(
      page.getByText("E2E Published Dataset").first()
    ).toBeVisible();
  });

  test("draft dataset does not appear on public listing", async ({ page }) => {
    await page.goto("/datasets");
    await expect(page.getByText("E2E Draft Dataset")).not.toBeVisible();
  });
});
