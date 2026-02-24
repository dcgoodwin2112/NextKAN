import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatasetForm } from "./DatasetForm";

const mockOrgs = [
  { id: "a1b2c3d4-e5f6-1234-a567-123456789abc", name: "Test Org" },
  { id: "b2c3d4e5-f6a1-2345-b678-234567890def", name: "Other Org" },
];

const mockInitialData = {
  id: "ds-1",
  title: "Existing Dataset",
  description: "An existing dataset description",
  identifier: "EXISTING-001",
  accessLevel: "public",
  status: "published",
  publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  contactName: "John Doe",
  contactEmail: "john@example.com",
  bureauCode: null,
  programCode: null,
  license: null,
  rights: null,
  spatial: null,
  temporal: null,
  issued: null,
  accrualPeriodicity: null,
  conformsTo: null,
  dataQuality: null,
  describedBy: null,
  isPartOf: null,
  landingPage: null,
  language: "en-us",
  theme: null,
  references: null,
  keywords: [{ keyword: "existing" }, { keyword: "data" }],
  distributions: [
    {
      id: "dist-1",
      title: "CSV",
      downloadURL: "https://example.com/data.csv",
      accessURL: null,
      mediaType: "text/csv",
      format: "CSV",
      description: null,
    },
  ],
};

describe("DatasetForm", () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders all required field inputs", () => {
    render(<DatasetForm organizations={mockOrgs} onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/keywords/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/publisher/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/access level/i)).toBeInTheDocument();
  });

  it("shows validation errors on submit with empty form", async () => {
    const user = userEvent.setup();
    render(<DatasetForm organizations={mockOrgs} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with correct data when valid form submitted", async () => {
    const user = userEvent.setup();
    render(<DatasetForm organizations={mockOrgs} onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/title/i), "New Dataset");
    await user.type(screen.getByLabelText(/description/i), "A new dataset");
    await user.selectOptions(screen.getByLabelText(/publisher/i), [
      "a1b2c3d4-e5f6-1234-a567-123456789abc",
    ]);

    // Add keyword
    const keywordInput = screen.getByLabelText(/keywords/i);
    await user.type(keywordInput, "health{Enter}");

    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Dataset",
          description: "A new dataset",
          publisherId: "a1b2c3d4-e5f6-1234-a567-123456789abc",
          keywords: ["health"],
        })
      );
    });
  });

  it("pre-fills form in edit mode when initialData provided", () => {
    render(
      <DatasetForm
        initialData={mockInitialData}
        organizations={mockOrgs}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue("Existing Dataset");
    expect(screen.getByLabelText(/description/i)).toHaveValue(
      "An existing dataset description"
    );
    expect(screen.getByText("existing")).toBeInTheDocument();
    expect(screen.getByText("data")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("renders distribution sub-form", async () => {
    const user = userEvent.setup();
    render(<DatasetForm organizations={mockOrgs} onSubmit={mockOnSubmit} />);

    await user.click(screen.getByText(/add distribution/i));
    expect(screen.getByTestId("distribution-form")).toBeInTheDocument();
  });

  it("can add and remove distribution entries", async () => {
    const user = userEvent.setup();
    render(<DatasetForm organizations={mockOrgs} onSubmit={mockOnSubmit} />);

    // Add distribution
    await user.click(screen.getByText(/add distribution/i));
    await user.type(screen.getByLabelText(/^title$/i), "CSV Data");
    await user.type(
      screen.getByLabelText(/download url/i),
      "https://example.com/data.csv"
    );
    await user.click(screen.getByText("Add Distribution"));

    // Verify it appears in the list
    expect(screen.getByText("CSV Data")).toBeInTheDocument();

    // Remove it
    await user.click(screen.getByLabelText(/remove distribution 1/i));
    expect(screen.queryByText("CSV Data")).not.toBeInTheDocument();
  });
});
