import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceCard } from "./ResourceCard";

vi.mock("@/components/analytics/DownloadLink", () => ({
  DownloadLink: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const baseDistribution = {
  id: "d1",
  title: "Census CSV",
  description: "CSV export of census data",
  downloadURL: "https://example.com/data.csv",
  accessURL: null,
  format: "CSV",
  filePath: null,
};

describe("ResourceCard", () => {
  it("renders title and format badge", () => {
    render(<ResourceCard distribution={baseDistribution} index={0} />);
    expect(screen.getByText("Census CSV")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<ResourceCard distribution={baseDistribution} index={0} />);
    expect(
      screen.getByText("CSV export of census data")
    ).toBeInTheDocument();
  });

  it("renders fallback title when no title provided", () => {
    render(
      <ResourceCard
        distribution={{ ...baseDistribution, title: null }}
        index={2}
      />
    );
    expect(screen.getByText("Resource 3")).toBeInTheDocument();
  });

  it("renders download link", () => {
    render(<ResourceCard distribution={baseDistribution} index={0} />);
    const link = screen.getByText("Download");
    expect(link).toHaveAttribute("href", "https://example.com/data.csv");
  });

  it("does not show expand button when no preview/dictionary", () => {
    render(<ResourceCard distribution={baseDistribution} index={0} />);
    expect(
      screen.queryByRole("button", { name: /expand|collapse/i })
    ).not.toBeInTheDocument();
  });

  it("shows expand button with aria-controls when expandable content exists", () => {
    render(
      <ResourceCard
        distribution={baseDistribution}
        index={0}
        previewContent={<div>Preview</div>}
      />
    );
    const btn = screen.getByRole("button", {
      name: "Expand resource details",
    });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(btn).toHaveAttribute("aria-controls", "resource-content-0");
  });

  it("toggles expanded state and shows content", async () => {
    const user = userEvent.setup();
    render(
      <ResourceCard
        distribution={baseDistribution}
        index={0}
        previewContent={<div>Preview data</div>}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Expand resource details" })
    );
    expect(screen.getByText("Preview data")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse resource details" })
    ).toHaveAttribute("aria-expanded", "true");
  });
});
