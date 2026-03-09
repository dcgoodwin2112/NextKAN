import { test, expect } from "@playwright/test";

test.describe("Editorial workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("full draft → review → approve → publish cycle", async ({ page }) => {
    // Create a new dataset for this test
    await page.goto("/admin/datasets/new");
    await page.getByLabel(/title/i).fill("E2E Workflow Dataset");
    await page.getByLabel(/description/i).fill("Testing editorial workflow");
    await page
      .getByLabel(/publisher/i)
      .selectOption({ label: "E2E Test Agency" });

    const keywordInput = page.getByLabel(/keywords/i);
    await keywordInput.fill("workflow");
    await keywordInput.press("Enter");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/admin\/datasets/, { timeout: 10000 });

    // Navigate to the created dataset's edit page
    await page.goto("/admin/datasets");
    await page.waitForLoadState("networkidle");
    const datasetLink = page.getByText("E2E Workflow Dataset").first();
    if (!(await datasetLink.isVisible({ timeout: 3000 }).catch(() => false))) {
      await page.getByRole("button", { name: "Next" }).click();
      await page.waitForLoadState("networkidle");
    }
    await datasetLink.click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });

    // Scope status checks to the workflow panel
    const workflowPanel = page.getByRole("heading", { name: "Editorial Workflow" }).locator("..");
    await expect(workflowPanel).toBeVisible();

    // Verify initial draft status and Submit for Review button
    await expect(workflowPanel.getByText("Draft", { exact: true })).toBeVisible();
    const submitButton = workflowPanel.getByRole("button", {
      name: "Submit for Review",
    });
    await expect(submitButton).toBeVisible();

    // Transition: draft → pending_review
    await submitButton.click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });
    await expect(
      workflowPanel.getByText("Pending Review", { exact: true })
    ).toBeVisible();
    await expect(
      workflowPanel.getByRole("button", { name: "Approve" })
    ).toBeVisible();
    await expect(
      workflowPanel.getByRole("button", { name: "Reject" })
    ).toBeVisible();

    // Transition: pending_review → approved
    await workflowPanel.getByRole("button", { name: "Approve" }).click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });
    await expect(
      workflowPanel.getByText("Approved", { exact: true })
    ).toBeVisible();
    await expect(
      workflowPanel.getByRole("button", { name: "Publish" })
    ).toBeVisible();

    // Transition: approved → published
    await workflowPanel.getByRole("button", { name: "Publish" }).click();
    await expect(page).toHaveURL(/\/admin\/datasets\/.*\/edit/, {
      timeout: 10000,
    });
    await expect(
      workflowPanel.getByText("Published", { exact: true })
    ).toBeVisible();

    // Verify workflow history shows all 3 transitions
    await expect(workflowPanel.getByText("Workflow History")).toBeVisible();
    await expect(
      workflowPanel.getByText(/Draft to Pending Review/i)
    ).toBeVisible();
    await expect(
      workflowPanel.getByText(/Pending Review to Approved/i)
    ).toBeVisible();
    await expect(
      workflowPanel.getByText(/Approved to Published/i)
    ).toBeVisible();
  });
});
