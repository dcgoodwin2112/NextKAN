import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DataPreview } from "./DataPreview";

const mockCsvResponse = {
  type: "csv",
  columns: ["name", "value"],
  rows: [
    { name: "Row 1", value: "100" },
    { name: "Row 2", value: "200" },
  ],
  totalRows: 2,
  truncated: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("DataPreview", () => {
  it("renders nothing when no filePath and no downloadURL", () => {
    const { container } = render(
      <DataPreview distributionId="dist-1" format="CSV" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders download link when no filePath but has downloadURL", () => {
    render(
      <DataPreview
        distributionId="dist-1"
        format="CSV"
        downloadURL="https://example.com/data.csv"
      />
    );
    expect(screen.getByText("Download file")).toHaveAttribute(
      "href",
      "https://example.com/data.csv"
    );
  });

  it("renders CSV table on successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCsvResponse),
    } as any);

    render(
      <DataPreview
        distributionId="dist-1"
        format="CSV"
        filePath="/uploads/data.csv"
      />
    );

    expect(screen.getByText("Loading preview...")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Row 1")).toBeTruthy();
      expect(screen.getByText("Row 2")).toBeTruthy();
    });
  });

  it("renders error message on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    } as any);

    render(
      <DataPreview
        distributionId="dist-1"
        format="CSV"
        filePath="/uploads/data.csv"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Preview unavailable/)).toBeTruthy();
    });
  });

  it("renders PDF iframe when format is PDF", () => {
    render(
      <DataPreview
        distributionId="dist-1"
        format="PDF"
        downloadURL="https://example.com/doc.pdf"
      />
    );
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("src")).toBe("https://example.com/doc.pdf");
  });
});
