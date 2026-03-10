import Papa from "papaparse";
import { dictionaryFieldTypes } from "@/lib/schemas/data-dictionary";
import type { DataDictionaryFieldInput } from "@/lib/schemas/data-dictionary";

const validTypes = new Set<string>(dictionaryFieldTypes);

interface ParseError {
  row: number;
  message: string;
}

interface ParseResult {
  fields: DataDictionaryFieldInput[];
  errors: ParseError[];
}

/** Parse a CSV string into data dictionary fields. */
export function parseDictionaryCSV(csv: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const fields: DataDictionaryFieldInput[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 1;

    if (!row.name?.trim()) {
      errors.push({ row: rowNum, message: "Missing required field 'name'" });
      continue;
    }

    const type = row.type?.trim();
    if (!type || !validTypes.has(type)) {
      errors.push({
        row: rowNum,
        message: `Invalid type '${type || ""}'. Must be one of: ${dictionaryFieldTypes.join(", ")}`,
      });
      continue;
    }

    fields.push({
      name: row.name.trim(),
      type: type as DataDictionaryFieldInput["type"],
      title: row.title?.trim() || undefined,
      description: row.description?.trim() || undefined,
      format: row.format?.trim() || undefined,
      constraints: row.constraints?.trim() || undefined,
      sortOrder: fields.length,
    });
  }

  return { fields, errors };
}

/** Parse a Frictionless Table Schema JSON string into data dictionary fields. */
export function parseDictionaryJSON(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { fields: [], errors: [{ row: 0, message: "Invalid JSON" }] };
  }

  // Accept { fields: [...] } or bare array
  let rawFields: unknown[];
  if (Array.isArray(parsed)) {
    rawFields = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "fields" in parsed &&
    Array.isArray((parsed as { fields: unknown }).fields)
  ) {
    rawFields = (parsed as { fields: unknown[] }).fields;
  } else {
    return {
      fields: [],
      errors: [{ row: 0, message: "Expected { fields: [...] } or an array" }],
    };
  }

  const fields: DataDictionaryFieldInput[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < rawFields.length; i++) {
    const item = rawFields[i] as Record<string, unknown>;
    const rowNum = i + 1;

    if (!item.name || typeof item.name !== "string") {
      errors.push({ row: rowNum, message: "Missing required field 'name'" });
      continue;
    }

    const type = typeof item.type === "string" ? item.type : "";
    if (!validTypes.has(type)) {
      errors.push({
        row: rowNum,
        message: `Invalid type '${type}'. Must be one of: ${dictionaryFieldTypes.join(", ")}`,
      });
      continue;
    }

    const constraints =
      item.constraints && typeof item.constraints === "object"
        ? JSON.stringify(item.constraints)
        : typeof item.constraints === "string"
          ? item.constraints
          : undefined;

    fields.push({
      name: item.name,
      type: type as DataDictionaryFieldInput["type"],
      title: typeof item.title === "string" ? item.title : undefined,
      description:
        typeof item.description === "string" ? item.description : undefined,
      format: typeof item.format === "string" ? item.format : undefined,
      constraints,
      sortOrder: fields.length,
    });
  }

  return { fields, errors };
}

/** Export fields as CSV string. */
export function exportDictionaryCSV(
  fields: DataDictionaryFieldInput[]
): string {
  const data = fields.map((f) => ({
    name: f.name,
    type: f.type,
    title: f.title || "",
    description: f.description || "",
    format: f.format || "",
    constraints: f.constraints || "",
  }));

  return Papa.unparse(data, {
    columns: ["name", "type", "title", "description", "format", "constraints"],
  });
}

/** Export fields as Frictionless Table Schema JSON string. */
export function exportDictionaryJSON(
  fields: DataDictionaryFieldInput[]
): string {
  const schema = {
    fields: fields.map((f) => {
      const out: Record<string, unknown> = { name: f.name, type: f.type };
      if (f.title) out.title = f.title;
      if (f.description) out.description = f.description;
      if (f.format) out.format = f.format;
      if (f.constraints) {
        try {
          out.constraints = JSON.parse(f.constraints);
        } catch {
          out.constraints = f.constraints;
        }
      }
      return out;
    }),
  };

  return JSON.stringify(schema, null, 2);
}
