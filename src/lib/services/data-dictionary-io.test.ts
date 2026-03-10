import { describe, it, expect } from "vitest";
import {
  parseDictionaryCSV,
  parseDictionaryJSON,
  exportDictionaryCSV,
  exportDictionaryJSON,
} from "./data-dictionary-io";

describe("parseDictionaryCSV", () => {
  it("parses valid CSV with all columns", () => {
    const csv = `name,type,title,description,format,constraints
id,integer,Record ID,The unique identifier,,%7B%22required%22%3Atrue%7D
name,string,Name,Full name,,`;

    const result = parseDictionaryCSV(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0]).toMatchObject({
      name: "id",
      type: "integer",
      title: "Record ID",
      description: "The unique identifier",
      sortOrder: 0,
    });
    expect(result.fields[1]).toMatchObject({
      name: "name",
      type: "string",
      sortOrder: 1,
    });
  });

  it("returns error for missing name", () => {
    const csv = `name,type
,string
valid,integer`;

    const result = parseDictionaryCSV(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      row: 1,
      message: "Missing required field 'name'",
    });
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].name).toBe("valid");
  });

  it("returns error for invalid type", () => {
    const csv = `name,type
field1,badtype`;

    const result = parseDictionaryCSV(csv);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(1);
    expect(result.errors[0].message).toContain("Invalid type 'badtype'");
  });

  it("returns empty fields for empty CSV", () => {
    const result = parseDictionaryCSV("");
    expect(result.fields).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("preserves constraints column as string", () => {
    const csv = `name,type,constraints
id,integer,{"required":true}`;

    const result = parseDictionaryCSV(csv);
    expect(result.fields[0].constraints).toBe('{"required":true}');
  });
});

describe("parseDictionaryJSON", () => {
  it("parses valid Frictionless Table Schema", () => {
    const json = JSON.stringify({
      fields: [
        { name: "id", type: "integer", title: "Record ID" },
        { name: "value", type: "string", description: "A value" },
      ],
    });

    const result = parseDictionaryJSON(json);
    expect(result.errors).toHaveLength(0);
    expect(result.fields).toHaveLength(2);
    expect(result.fields[0]).toMatchObject({
      name: "id",
      type: "integer",
      title: "Record ID",
      sortOrder: 0,
    });
  });

  it("accepts bare array input", () => {
    const json = JSON.stringify([
      { name: "col1", type: "string" },
      { name: "col2", type: "number" },
    ]);

    const result = parseDictionaryJSON(json);
    expect(result.errors).toHaveLength(0);
    expect(result.fields).toHaveLength(2);
  });

  it("returns error for invalid type", () => {
    const json = JSON.stringify({ fields: [{ name: "x", type: "invalid" }] });
    const result = parseDictionaryJSON(json);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Invalid type 'invalid'");
  });

  it("returns error for missing fields key and not array", () => {
    const json = JSON.stringify({ something: "else" });
    const result = parseDictionaryJSON(json);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Expected");
  });

  it("stringifies constraints object", () => {
    const json = JSON.stringify({
      fields: [
        { name: "id", type: "integer", constraints: { required: true } },
      ],
    });

    const result = parseDictionaryJSON(json);
    expect(result.fields[0].constraints).toBe('{"required":true}');
  });

  it("returns error for malformed JSON", () => {
    const result = parseDictionaryJSON("{bad json");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe("Invalid JSON");
  });
});

describe("exportDictionaryCSV", () => {
  it("exports fields with all columns as valid CSV", () => {
    const csv = exportDictionaryCSV([
      {
        name: "id",
        type: "integer",
        title: "Record ID",
        description: "The ID",
        format: "default",
        constraints: '{"required":true}',
        sortOrder: 0,
      },
    ]);

    expect(csv).toContain("name,type,title,description,format,constraints");
    expect(csv).toContain("id,integer,Record ID,The ID,default,");
  });

  it("outputs empty cells for null/undefined values", () => {
    const csv = exportDictionaryCSV([
      { name: "col", type: "string", sortOrder: 0 },
    ]);

    expect(csv).toContain("col,string,,,,");
  });
});

describe("exportDictionaryJSON", () => {
  it("exports valid Frictionless Table Schema JSON", () => {
    const json = exportDictionaryJSON([
      {
        name: "id",
        type: "integer",
        title: "Record ID",
        sortOrder: 0,
      },
    ]);

    const parsed = JSON.parse(json);
    expect(parsed.fields).toHaveLength(1);
    expect(parsed.fields[0]).toEqual({
      name: "id",
      type: "integer",
      title: "Record ID",
    });
  });

  it("parses constraints string to object in output", () => {
    const json = exportDictionaryJSON([
      {
        name: "id",
        type: "integer",
        constraints: '{"required":true}',
        sortOrder: 0,
      },
    ]);

    const parsed = JSON.parse(json);
    expect(parsed.fields[0].constraints).toEqual({ required: true });
  });

  it("omits empty optional fields", () => {
    const json = exportDictionaryJSON([
      { name: "col", type: "string", sortOrder: 0 },
    ]);

    const parsed = JSON.parse(json);
    expect(parsed.fields[0]).toEqual({ name: "col", type: "string" });
    expect(parsed.fields[0]).not.toHaveProperty("title");
    expect(parsed.fields[0]).not.toHaveProperty("description");
  });
});
