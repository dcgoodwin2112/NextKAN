import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "./ThemeProvider";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a button with accessible label", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDefined();
    expect(button.getAttribute("aria-label")).toBeTruthy();
  });

  it("cycles through themes: system -> light -> dark -> system", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button");

    // Default is system, click cycles to light
    expect(button.getAttribute("aria-label")).toContain("System theme");
    await user.click(button);

    // Now light, click cycles to dark
    expect(button.getAttribute("aria-label")).toContain("Light mode");
    await user.click(button);

    // Now dark, click cycles to system
    expect(button.getAttribute("aria-label")).toContain("Dark mode");
    await user.click(button);

    // Back to system
    expect(button.getAttribute("aria-label")).toContain("System theme");
  });
});
