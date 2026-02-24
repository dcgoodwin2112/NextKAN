import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataDictionaryView } from "./DataDictionaryView";
import type { DataDictionaryField } from "@/generated/prisma/client";

describe("DataDictionaryView", () => {
  it("renders a table of fields", () => {
    const fields = [
      {
        id: "f1",
        dictionaryId: "d1",
        name: "id",
        title: "Record ID",
        type: "integer",
        description: "Unique identifier",
        format: null,
        constraints: null,
        sortOrder: 0,
      },
      {
        id: "f2",
        dictionaryId: "d1",
        name: "name",
        title: null,
        type: "string",
        description: null,
        format: null,
        constraints: null,
        sortOrder: 1,
      },
    ] as DataDictionaryField[];

    render(<DataDictionaryView fields={fields} />);

    expect(screen.getByText("Record ID")).toBeInTheDocument();
    expect(screen.getByText("integer")).toBeInTheDocument();
    expect(screen.getByText("Unique identifier")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("shows empty message when no fields", () => {
    render(<DataDictionaryView fields={[]} />);

    expect(
      screen.getByText("No data dictionary available for this distribution.")
    ).toBeInTheDocument();
  });
});
