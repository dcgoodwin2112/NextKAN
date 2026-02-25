import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DistributionPreviewPanel,
  type DistributionPreviewItem,
} from "./DistributionPreviewPanel";

vi.mock("@/components/datasets/DataPreview", () => ({
  DataPreview: ({ distributionId }: { distributionId: string }) => (
    <div data-testid={`data-preview-${distributionId}`}>DataPreview</div>
  ),
}));

function makeDist(overrides: Partial<DistributionPreviewItem> = {}): DistributionPreviewItem {
  return {
    id: "dist-1",
    title: "Test Distribution",
    format: "CSV",
    mediaType: "text/csv",
    filePath: "/uploads/test.csv",
    downloadURL: "/api/download/test.csv",
    fileName: "test.csv",
    fileSize: 2048,
    datastoreTable: null,
    hasDictionary: false,
    ...overrides,
  };
}

describe("DistributionPreviewPanel", () => {
  it("renders nothing for empty distributions", () => {
    const { container } = render(
      <DistributionPreviewPanel distributions={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders collapsed by default with title and format badge", () => {
    render(
      <DistributionPreviewPanel distributions={[makeDist()]} />
    );
    expect(screen.getByText("Test Distribution")).toBeDefined();
    expect(screen.getByText("CSV")).toBeDefined();
    expect(screen.getByText("▶")).toBeDefined();
    expect(screen.queryByTestId("data-preview-dist-1")).toBeNull();
  });

  it("shows fileName when title is null", () => {
    render(
      <DistributionPreviewPanel
        distributions={[makeDist({ title: null, fileName: "data.csv" })]}
      />
    );
    expect(screen.getByText("data.csv")).toBeDefined();
  });

  it("shows datastore status badge in header", () => {
    render(
      <DistributionPreviewPanel
        distributions={[
          makeDist({
            datastoreTable: {
              status: "ready",
              rowCount: 100,
              columns: '[{"name":"a"},{"name":"b"}]',
              errorMessage: null,
            },
          }),
        ]}
      />
    );
    expect(screen.getByText("ready")).toBeDefined();
  });

  it("expands on click showing DataPreview and datastore info", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPreviewPanel
        distributions={[
          makeDist({
            datastoreTable: {
              status: "ready",
              rowCount: 1500,
              columns: '[{"name":"a"},{"name":"b"},{"name":"c"}]',
              errorMessage: null,
            },
          }),
        ]}
      />
    );

    await user.click(screen.getByText("Test Distribution"));

    expect(screen.getByText("▼")).toBeDefined();
    expect(screen.getByTestId("data-preview-dist-1")).toBeDefined();
    expect(screen.getByText("1,500 rows")).toBeDefined();
    expect(screen.getByText("3 columns")).toBeDefined();
  });

  it("shows error message when datastore status is error", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPreviewPanel
        distributions={[
          makeDist({
            datastoreTable: {
              status: "error",
              rowCount: 0,
              columns: "[]",
              errorMessage: "CSV parsing failed",
            },
          }),
        ]}
      />
    );

    await user.click(screen.getByText("Test Distribution"));

    expect(screen.getByText("CSV parsing failed")).toBeDefined();
  });

  it("shows dictionary link when hasDictionary is true", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPreviewPanel
        distributions={[makeDist({ hasDictionary: true })]}
      />
    );

    await user.click(screen.getByText("Test Distribution"));

    const link = screen.getByText("Edit Dictionary");
    expect(link).toBeDefined();
    expect(link.closest("a")?.getAttribute("href")).toBe("#data-dictionaries");
  });

  it("does not show dictionary link when hasDictionary is false", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPreviewPanel
        distributions={[makeDist({ hasDictionary: false })]}
      />
    );

    await user.click(screen.getByText("Test Distribution"));

    expect(screen.queryByText("Edit Dictionary")).toBeNull();
  });
});
