import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { DataDictionaryEditor } from "./DataDictionaryEditor";
import type { DataDictionaryField } from "@/generated/prisma/client";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("DataDictionaryEditor", () => {
  const mockFields = [
    {
      id: "f1",
      dictionaryId: "d1",
      name: "id",
      title: "Record ID",
      type: "integer",
      description: "The ID",
      format: null,
      constraints: null,
      sortOrder: 0,
    },
    {
      id: "f2",
      dictionaryId: "d1",
      name: "value",
      title: null,
      type: "string",
      description: null,
      format: null,
      constraints: null,
      sortOrder: 1,
    },
  ] as DataDictionaryField[];

  it("renders rows for each field", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByDisplayValue("id")).toBeInTheDocument();
    expect(screen.getByDisplayValue("value")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Record ID")).toBeInTheDocument();
    expect(screen.getByDisplayValue("The ID")).toBeInTheDocument();
  });

  it("allows editing fields", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={vi.fn()}
      />
    );

    const titleInput = screen.getByDisplayValue("Record ID");
    await user.clear(titleInput);
    await user.type(titleInput, "ID Number");

    expect(screen.getByDisplayValue("ID Number")).toBeInTheDocument();
  });

  it("calls onSave when save button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={onSave}
      />
    );

    await user.click(screen.getByText("Save Data Dictionary"));

    expect(onSave).toHaveBeenCalledWith("dist-1", expect.any(Array));
  });

  it("shows add field button when no fields", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Add Field")).toBeInTheDocument();
    expect(screen.queryByText("Save Data Dictionary")).not.toBeInTheDocument();
  });

  it("adds a new field when add field button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    await user.click(screen.getByText("Add Field"));

    expect(screen.getByPlaceholderText("field_name")).toBeInTheDocument();
    expect(screen.getByText("Save Data Dictionary")).toBeInTheDocument();
  });

  it("removes a field when remove button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={vi.fn()}
      />
    );

    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);

    expect(screen.queryByDisplayValue("id")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("value")).toBeInTheDocument();
  });

  it("shows import button always", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Import...")).toBeInTheDocument();
  });

  it("hides export buttons when no fields", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByText("Export CSV")).not.toBeInTheDocument();
    expect(screen.queryByText("Export JSON")).not.toBeInTheDocument();
  });

  it("shows export buttons when fields exist", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Export CSV")).toBeInTheDocument();
    expect(screen.getByText("Export JSON")).toBeInTheDocument();
  });

  it("imports CSV file and replaces fields", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    const csvContent = "name,type,title\ncol1,string,Column One\ncol2,integer,Column Two";
    const file = new File([csvContent], "dict.csv", { type: "text/csv" });

    const input = screen.getByTestId("dictionary-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByDisplayValue("col1")).toBeInTheDocument();
      expect(screen.getByDisplayValue("col2")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Column One")).toBeInTheDocument();
    });

    expect(screen.getByText(/Imported 2 field/)).toBeInTheDocument();
  });

  it("imports JSON file and replaces fields", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    const jsonContent = JSON.stringify({
      fields: [{ name: "jsonfield", type: "boolean", title: "JSON Field" }],
    });
    const file = new File([jsonContent], "dict.json", {
      type: "application/json",
    });

    const input = screen.getByTestId("dictionary-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByDisplayValue("jsonfield")).toBeInTheDocument();
      expect(screen.getByDisplayValue("JSON Field")).toBeInTheDocument();
    });
  });

  it("shows success toast after saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={onSave}
      />
    );

    await user.click(screen.getByText("Save Data Dictionary"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Data dictionary saved");
    });
  });

  it("shows error toast when save fails", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Save failed"));

    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={mockFields}
        onSave={onSave}
      />
    );

    await user.click(screen.getByText("Save Data Dictionary"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save data dictionary");
    });
  });

  it("shows error summary on import with errors", async () => {
    const user = userEvent.setup();
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    const csvContent = "name,type\n,string\nvalid,badtype";
    const file = new File([csvContent], "bad.csv", { type: "text/csv" });

    const input = screen.getByTestId("dictionary-file-input");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Import errors/)).toBeInTheDocument();
    });
  });
});
