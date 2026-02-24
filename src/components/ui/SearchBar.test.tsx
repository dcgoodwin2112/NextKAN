import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("SearchBar", () => {
  it("renders search input", () => {
    render(<SearchBar />);
    expect(
      screen.getByRole("searchbox", { name: /search datasets/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /search/i })
    ).toBeInTheDocument();
  });

  it("navigates to /datasets?search= on submit", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(
      screen.getByRole("searchbox", { name: /search datasets/i }),
      "climate"
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(mockPush).toHaveBeenCalledWith("/datasets?search=climate");
  });
});
