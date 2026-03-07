import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomFieldForm } from "./CustomFieldForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockOrgs = [
  { id: "org-1", name: "Test Org" },
];

describe("CustomFieldForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders all form fields", () => {
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Label *")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Required")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort Order")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization Scope")).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows validation error for empty label", async () => {
    const user = userEvent.setup();
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "test_field");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText("Label is required")).toBeInTheDocument();
  });

  it("submits valid form data", async () => {
    const user = userEvent.setup();
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Name *"), "test_field");
    await user.type(screen.getByLabelText("Label *"), "Test Field");
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "test_field",
        label: "Test Field",
        type: "text",
        required: false,
      })
    );
  });

  it("shows options field for select type", async () => {
    const user = userEvent.setup();
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    await user.selectOptions(screen.getByLabelText("Type"), "select");
    expect(screen.getByText("Options")).toBeInTheDocument();
  });

  it("hides options field for text type", () => {
    render(<CustomFieldForm organizations={mockOrgs} onSubmit={onSubmit} />);
    expect(screen.queryByText("Options")).not.toBeInTheDocument();
  });

  it("populates form when editing", () => {
    render(
      <CustomFieldForm
        initialData={{
          id: "cfd-1",
          name: "dept_code",
          label: "Department Code",
          type: "text",
          required: true,
          options: null,
          sortOrder: 5,
          organizationId: null,
        }}
        organizations={mockOrgs}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByLabelText("Name *")).toHaveValue("dept_code");
    expect(screen.getByLabelText("Label *")).toHaveValue("Department Code");
    expect(screen.getByLabelText("Required")).toBeChecked();
    expect(screen.getByLabelText("Sort Order")).toHaveValue(5);
  });

  it("disables name field when editing", () => {
    render(
      <CustomFieldForm
        initialData={{
          id: "cfd-1",
          name: "dept_code",
          label: "Department Code",
          type: "text",
          required: false,
          options: null,
          sortOrder: 0,
          organizationId: null,
        }}
        organizations={mockOrgs}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByLabelText("Name *")).toBeDisabled();
  });
});
