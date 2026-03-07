import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DistributionPicker,
  type ChartableDistribution,
} from "./DistributionPicker";

const distributions: ChartableDistribution[] = [
  {
    distributionId: "dist-1",
    datasetTitle: "Budget Data",
    distributionTitle: "budget.csv",
    format: "CSV",
    organization: "Finance Dept",
    rowCount: 100,
  },
  {
    distributionId: "dist-2",
    datasetTitle: "Budget Data",
    distributionTitle: "budget-summary.csv",
    format: "CSV",
    organization: "Finance Dept",
    rowCount: 25,
  },
  {
    distributionId: "dist-3",
    datasetTitle: "Traffic Counts",
    distributionTitle: "traffic.csv",
    format: "CSV",
    organization: "Transportation",
    rowCount: 500,
  },
];

describe("DistributionPicker", () => {
  it("renders search input and grouped distributions", () => {
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    expect(
      screen.getByLabelText("Search distributions")
    ).toBeInTheDocument();
    expect(screen.getByText("Budget Data")).toBeInTheDocument();
    expect(screen.getByText("Traffic Counts")).toBeInTheDocument();
  });

  it("groups distributions by dataset title", () => {
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    // Budget Data group should show count badge of 2
    const budgetGroup = screen.getByText("Budget Data").closest("div")!;
    expect(budgetGroup).toHaveTextContent("2");

    // Traffic Counts group should show count badge of 1
    const trafficGroup = screen.getByText("Traffic Counts").closest("div")!;
    expect(trafficGroup).toHaveTextContent("1");
  });

  it("filters by search text matching dataset title", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    await user.type(screen.getByLabelText("Search distributions"), "budget");

    expect(screen.getByText("Budget Data")).toBeInTheDocument();
    expect(screen.queryByText("Traffic Counts")).not.toBeInTheDocument();
  });

  it("filters by search text matching organization name", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    await user.type(
      screen.getByLabelText("Search distributions"),
      "transportation"
    );

    expect(screen.getByText("Traffic Counts")).toBeInTheDocument();
    expect(screen.queryByText("Budget Data")).not.toBeInTheDocument();
  });

  it("filters by search text matching distribution title", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    await user.type(
      screen.getByLabelText("Search distributions"),
      "budget-summary"
    );

    expect(screen.getByText("budget-summary.csv")).toBeInTheDocument();
    expect(screen.queryByText("traffic.csv")).not.toBeInTheDocument();
  });

  it("calls onChange when a distribution item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={onChange}
      />
    );

    await user.click(screen.getByText("budget.csv"));

    expect(onChange).toHaveBeenCalledWith("dist-1");
  });

  it("highlights selected distribution", () => {
    render(
      <DistributionPicker
        distributions={distributions}
        value="dist-1"
        onChange={() => {}}
      />
    );

    // Selected summary should appear with row count info
    expect(screen.getByText("(100 rows)")).toBeInTheDocument();

    // The selected button should have bg-primary-subtle
    const selectedButton = screen.getByRole("button", { name: /budget\.csv/i });
    expect(selectedButton.className).toContain("bg-primary-subtle");
  });

  it("shows empty state when no search matches", async () => {
    const user = userEvent.setup();
    render(
      <DistributionPicker
        distributions={distributions}
        value=""
        onChange={() => {}}
      />
    );

    await user.type(
      screen.getByLabelText("Search distributions"),
      "nonexistent"
    );

    expect(
      screen.getByText("No matching distributions")
    ).toBeInTheDocument();
  });
});
