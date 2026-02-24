import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartBuilder } from "./ChartBuilder";

// Mock recharts to avoid DOM measurement issues in tests
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

describe("ChartBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders chart type selector and loads columns", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: [
          { name: "category", type: "TEXT" },
          { name: "count", type: "INTEGER" },
          { name: "value", type: "REAL" },
        ],
      }),
    });

    render(<ChartBuilder distributionId="dist-1" />);

    expect(screen.getByText("Chart Builder")).toBeInTheDocument();

    // Wait for columns to load — numeric columns appear as checkboxes
    await waitFor(() => {
      expect(screen.getByLabelText("count")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("value")).toBeInTheDocument();
  });

  it("renders chart preview after clicking Preview", async () => {
    const user = userEvent.setup();

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          columns: [
            { name: "x", type: "TEXT" },
            { name: "y", type: "INTEGER" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [
            { x: "a", y: 1 },
            { x: "b", y: 2 },
          ],
        }),
      });

    render(<ChartBuilder distributionId="dist-1" />);

    await waitFor(() => {
      expect(screen.getByText("Preview")).not.toBeDisabled();
    });

    await user.click(screen.getByText("Preview"));

    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
    });
  });

  it("shows embed code after saving", async () => {
    const user = userEvent.setup();

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          columns: [
            { name: "x", type: "TEXT" },
            { name: "y", type: "INTEGER" },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ x: "a", y: 1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "chart-123" }),
      });

    render(<ChartBuilder distributionId="dist-1" />);

    await waitFor(() => {
      expect(screen.getByText("Preview")).not.toBeDisabled();
    });

    await user.click(screen.getByText("Preview"));

    await waitFor(() => {
      expect(screen.getByText("Save")).not.toBeDisabled();
    });

    await user.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(screen.getByText("Chart saved!")).toBeInTheDocument();
    });
  });

  it("supports switching chart type", async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        columns: [
          { name: "x", type: "TEXT" },
          { name: "y", type: "INTEGER" },
        ],
      }),
    });

    render(<ChartBuilder distributionId="dist-1" />);

    // The chart type select contains "Bar Chart" option by default
    const selects = screen.getAllByRole("combobox");
    const chartTypeSelect = selects[0]; // first select is chart type
    await user.selectOptions(chartTypeSelect, "line");

    expect((chartTypeSelect as HTMLSelectElement).value).toBe("line");
  });
});
