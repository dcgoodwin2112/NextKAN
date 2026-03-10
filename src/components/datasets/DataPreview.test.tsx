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

  it("renders Excel as table (type=csv from API)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "csv",
          columns: ["Department", "Budget"],
          rows: [{ Department: "Parks", Budget: "50000" }],
          totalRows: 1,
          truncated: false,
        }),
    } as any);

    render(
      <DataPreview
        distributionId="dist-1"
        format="XLSX"
        filePath="/uploads/budget.xlsx"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Department")).toBeTruthy();
      expect(screen.getByText("Parks")).toBeTruthy();
    });
  });

  it("renders json-table as table", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "json-table",
          columns: ["city", "pop"],
          rows: [{ city: "Springfield", pop: "50000" }],
          totalRows: 1,
          truncated: false,
        }),
    } as any);

    render(
      <DataPreview
        distributionId="dist-1"
        format="JSON"
        filePath="/uploads/data.json"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("city")).toBeTruthy();
      expect(screen.getByText("Springfield")).toBeTruthy();
    });
  });

  it("renders GeoJSON with table view and map/table toggle", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          type: "geojson",
          columns: ["name", "geometry"],
          rows: [{ name: "Park A", geometry: '{"type":"Point"}' }],
          totalRows: 1,
          truncated: false,
          geojson: { type: "FeatureCollection", features: [] },
        }),
    } as any);

    render(
      <DataPreview
        distributionId="dist-1"
        format="GEOJSON"
        filePath="/uploads/data.geojson"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Table")).toBeTruthy();
      expect(screen.getByText("Map")).toBeTruthy();
      expect(screen.getByText("Park A")).toBeTruthy();
    });
  });
});
