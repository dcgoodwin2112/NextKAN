import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetMetadata } from "./DatasetMetadata";

const baseDataset = {
  accessLevel: "public",
  contactName: "John Doe",
  contactEmail: "john@example.com",
  license: "CC0",
  accrualPeriodicity: "monthly",
  temporal: "2020/2024",
  spatial: "United States",
  issued: new Date("2020-01-15T00:00:00Z"),
  modified: new Date("2024-06-15T00:00:00Z"),
};

describe("DatasetMetadata", () => {
  it("renders all metadata items", () => {
    render(<DatasetMetadata dataset={baseDataset} />);
    expect(screen.getByText("Access Level")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(
      screen.getByText("John Doe (john@example.com)")
    ).toBeInTheDocument();
    expect(screen.getByText("License")).toBeInTheDocument();
    expect(screen.getByText("CC0")).toBeInTheDocument();
    expect(screen.getByText("Update Frequency")).toBeInTheDocument();
    expect(screen.getByText("monthly")).toBeInTheDocument();
    expect(screen.getByText("Temporal Coverage")).toBeInTheDocument();
    expect(screen.getByText("2020/2024")).toBeInTheDocument();
    expect(screen.getByText("Spatial Coverage")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("renders formatted dates", () => {
    render(<DatasetMetadata dataset={baseDataset} />);
    expect(screen.getByText("Jan 15, 2020")).toBeInTheDocument();
    expect(screen.getByText("Jun 15, 2024")).toBeInTheDocument();
  });

  it("renders custom fields", () => {
    const customFields = [
      { label: "Region", value: "Northeast", type: "text" },
      { label: "Active", value: "true", type: "boolean" },
    ];
    render(<DatasetMetadata dataset={baseDataset} customFields={customFields} />);
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Northeast")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders URL custom fields with opens-in-new-tab warning", () => {
    const customFields = [
      { label: "Source", value: "https://example.com", type: "url" },
    ];
    render(<DatasetMetadata dataset={baseDataset} customFields={customFields} />);
    const link = screen.getByRole("link", { name: /example\.com/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("(opens in new tab)")).toBeInTheDocument();
  });

  it("renders multiselect custom fields as comma-joined", () => {
    const customFields = [
      { label: "Tags", value: '["a","b","c"]', type: "multiselect" },
    ];
    render(<DatasetMetadata dataset={baseDataset} customFields={customFields} />);
    expect(screen.getByText("a, b, c")).toBeInTheDocument();
  });

  it("omits fields that are null/undefined", () => {
    render(
      <DatasetMetadata
        dataset={{
          modified: new Date("2024-06-15T00:00:00Z"),
          contactName: null,
          contactEmail: null,
          license: null,
          accrualPeriodicity: null,
          temporal: null,
          spatial: null,
          issued: null,
        }}
      />
    );
    expect(screen.queryByText("Contact")).not.toBeInTheDocument();
    expect(screen.queryByText("License")).not.toBeInTheDocument();
    expect(screen.getByText("Last Modified")).toBeInTheDocument();
  });
});
