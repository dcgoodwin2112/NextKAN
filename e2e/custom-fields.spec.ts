import { test, expect } from "@playwright/test";

test.describe.serial("Custom Fields", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("admin can create, edit, and delete a custom field definition", async ({ page }) => {
    // Create
    await page.goto("/admin/custom-fields/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name *").fill("grant_number");
    await page.getByLabel("Label *").fill("Grant Number");
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText("Grant Number")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("grant_number")).toBeVisible();

    // Edit — navigate directly to the edit page via the table link
    const editLink = page.getByRole("link", { name: /edit/i }).first();
    const editHref = await editLink.getAttribute("href");
    await page.goto(editHref!);
    await page.waitForLoadState("networkidle");
    await expect(page.getByLabel("Label *")).toBeVisible({ timeout: 10000 });
    await page.getByLabel("Label *").clear();
    await page.getByLabel("Label *").fill("Grant ID");
    await page.getByRole("button", { name: /^update$/i }).click();
    await expect(page.getByText("Grant ID")).toBeVisible({ timeout: 15000 });

    // Delete
    await page.getByRole("button", { name: /^delete$/i }).click();
    // Wait for confirmation dialog
    await expect(page.getByText("Are you sure?")).toBeVisible();
    await page.getByRole("button", { name: /^delete$/i }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("grant_number")).not.toBeVisible({ timeout: 5000 });
  });

  test("admin can create a select custom field with options", async ({ page }) => {
    await page.goto("/admin/custom-fields/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name *").fill("priority_level");
    await page.getByLabel("Label *").fill("Priority Level");
    await page.getByLabel("Type").selectOption("select");

    // Add options
    await page.getByPlaceholder("Type option and press Enter").fill("High");
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByPlaceholder("Type option and press Enter").fill("Medium");
    await page.getByRole("button", { name: "Add" }).click();
    await page.getByPlaceholder("Type option and press Enter").fill("Low");
    await page.getByRole("button", { name: "Add" }).click();

    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText("Priority Level")).toBeVisible({ timeout: 15000 });

    // Clean up
    await page.getByRole("button", { name: /^delete$/i }).first().click();
    await page.getByRole("button", { name: /^delete$/i }).last().click();
  });

  test("custom fields appear on dataset form and values show on public page", async ({ page }) => {
    // Create a text custom field first
    await page.goto("/admin/custom-fields/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Name *").fill("dept_code");
    await page.getByLabel("Label *").fill("Department Code");
    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText("Department Code")).toBeVisible({ timeout: 15000 });

    // Create a dataset with the custom field
    await page.goto("/admin/datasets/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/^title/i).fill("CF Test Dataset");
    await page.getByLabel(/description/i).fill("Testing custom fields");
    await page.getByLabel(/publisher/i).selectOption({ label: "E2E Test Agency" });

    const keywordInput = page.getByLabel(/keywords/i);
    await keywordInput.fill("cftest");
    await keywordInput.press("Enter");

    await page.getByLabel(/status/i).selectOption("published");

    // Fill custom field
    await page.getByLabel("Department Code").fill("DEPT-42");

    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 15000 });

    // Check public page
    await page.goto("/datasets/cf-test-dataset");
    await expect(page.getByText("Department Code")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("DEPT-42")).toBeVisible();

    // Clean up: delete the custom field definition
    await page.goto("/admin/custom-fields");
    await page.getByRole("button", { name: /^delete$/i }).first().click();
    await page.getByRole("button", { name: /^delete$/i }).last().click();
  });
});
