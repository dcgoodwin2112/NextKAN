import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders email and password inputs", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("admin pages redirect to /login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("valid login redirects to admin dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test("invalid login shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test("API mutations return 401 without auth", async ({ request }) => {
    const response = await request.post("/api/datasets", {
      data: { title: "Unauthorized" },
    });
    expect(response.status()).toBe(401);
  });

  test("logout clears session", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@example.com");
    await page.getByLabel(/password/i).fill("changeme");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Open user dropdown and click Sign Out
    await page.getByRole("button", { name: /admin/i }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    // signOut triggers a full redirect; wait for any navigation to complete
    await page.waitForTimeout(3000);

    // After sign out, visiting /admin should redirect to /login
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
