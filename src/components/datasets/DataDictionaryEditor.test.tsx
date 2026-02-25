import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataDictionaryEditor } from "./DataDictionaryEditor";
import type { DataDictionaryField } from "@/generated/prisma/client";

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
});
