import { z } from "zod";

export const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "url",
  "select",
  "multiselect",
  "boolean",
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const customFieldDefinitionCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, "Name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores"),
  label: z.string().min(1, "Label is required").max(255),
  type: z.enum(CUSTOM_FIELD_TYPES),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1)).optional(),
  sortOrder: z.number().int().default(0),
  organizationId: z.string().uuid().optional().or(z.literal("")),
});

export type CustomFieldDefinitionCreateInput = z.infer<typeof customFieldDefinitionCreateSchema>;

export const customFieldDefinitionUpdateSchema = customFieldDefinitionCreateSchema.partial();

export type CustomFieldDefinitionUpdateInput = z.infer<typeof customFieldDefinitionUpdateSchema>;

/** Validates a single custom field value against its definition. Returns error string or null. */
export function validateCustomFieldValue(
  value: string,
  definition: { type: string; required?: boolean; options?: string | null }
): string | null {
  if (!value && definition.required) {
    return "This field is required";
  }
  if (!value) return null;

  const options = definition.options ? (JSON.parse(definition.options) as string[]) : [];

  switch (definition.type) {
    case "number":
      if (isNaN(Number(value))) return "Must be a valid number";
      break;
    case "date":
      if (isNaN(Date.parse(value))) return "Must be a valid date";
      break;
    case "url":
      try {
        new URL(value);
      } catch {
        return "Must be a valid URL";
      }
      break;
    case "boolean":
      if (value !== "true" && value !== "false") return 'Must be "true" or "false"';
      break;
    case "select":
      if (options.length > 0 && !options.includes(value)) return `Must be one of: ${options.join(", ")}`;
      break;
    case "multiselect": {
      let parsed: string[];
      try {
        parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error();
      } catch {
        return "Must be a JSON array of strings";
      }
      if (options.length > 0) {
        const invalid = parsed.filter((v) => !options.includes(v));
        if (invalid.length > 0) return `Invalid options: ${invalid.join(", ")}`;
      }
      break;
    }
  }
  return null;
}
