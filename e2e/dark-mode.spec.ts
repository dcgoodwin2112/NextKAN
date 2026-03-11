import { test, expect } from "@playwright/test";

test.describe("Dark Mode", () => {
  test("respects system dark preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });

  test("respects system light preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);
  });

  test("toggle persists across navigation", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    // Should start in light mode (system=light)
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    // Use desktop nav toggle (first visible one)
    const toggle = page.getByRole("button", { name: /System theme/i }).first();
    await toggle.click();

    // Now light mode — click again to switch to dark
    const toggleLight = page.getByRole("button", { name: /Light mode/i }).first();
    await toggleLight.click();
    await expect(html).toHaveClass(/dark/);

    // Navigate to datasets page
    await page.goto("/datasets");
    // Dark class should persist
    await expect(html).toHaveClass(/dark/);
  });

  test("localStorage preference overrides system preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    // Set dark preference in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });

  test("no flash of unstyled content", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
    await page.addInitScript(() => {
      (window as any).__darkClassEarly = false;
      document.addEventListener("DOMContentLoaded", () => {
        (window as any).__darkClassEarly =
          document.documentElement.classList.contains("dark");
      });
    });
    await page.goto("/");
    const hadDarkClassEarly = await page.evaluate(
      () => (window as any).__darkClassEarly
    );
    expect(hadDarkClassEarly).toBe(true);
  });
});
