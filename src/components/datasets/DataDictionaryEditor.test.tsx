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

    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("value")).toBeInTheDocument();
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

  it("shows empty message when no fields", () => {
    render(
      <DataDictionaryEditor
        distributionId="dist-1"
        fields={[]}
        onSave={vi.fn()}
      />
    );

    expect(
      screen.getByText("No data dictionary. Import CSV data to auto-generate one.")
    ).toBeInTheDocument();
  });
});
