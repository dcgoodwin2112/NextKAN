import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

const mockPush = vi.fn();
const mockSearchParams = vi.hoisted(() => ({
  current: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams.current,
}));

beforeEach(() => {
  mockPush.mockClear();
  mockSearchParams.current = new URLSearchParams();
});

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

  it("preserves existing URL params when searching", async () => {
    mockSearchParams.current = new URLSearchParams("status=draft&org=org-1");
    const user = userEvent.setup();
    render(<SearchBar action="/admin/datasets" />);

    await user.type(
      screen.getByRole("searchbox", { name: /search datasets/i }),
      "climate"
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.get("status")).toBe("draft");
    expect(params.get("org")).toBe("org-1");
    expect(params.get("search")).toBe("climate");
    expect(params.has("page")).toBe(false);
  });

  it("resets page param when searching", async () => {
    mockSearchParams.current = new URLSearchParams("page=3");
    const user = userEvent.setup();
    render(<SearchBar />);

    await user.type(
      screen.getByRole("searchbox", { name: /search datasets/i }),
      "test"
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    const pushedUrl = mockPush.mock.calls[0][0] as string;
    const params = new URLSearchParams(pushedUrl.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("search")).toBe("test");
  });
});
