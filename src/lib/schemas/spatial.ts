import { z } from "zod";

export const boundingBoxSchema = z.object({
  type: z.literal("BoundingBox"),
  coordinates: z.tuple([
    z.number(), // west
    z.number(), // south
    z.number(), // east
    z.number(), // north
  ]),
});

export type BoundingBox = z.infer<typeof boundingBoxSchema>;

const geoJsonGeometrySchema = z.object({
  type: z.string(),
  coordinates: z.any(),
});

export const geoJsonSchema = z.object({
  type: z.literal("Feature").or(z.literal("FeatureCollection")).or(z.string()),
  geometry: geoJsonGeometrySchema.optional(),
  features: z.array(z.any()).optional(),
  coordinates: z.any().optional(),
});

export const spatialSchema = z.union([
  z.string(), // Plain text (e.g., "United States")
  boundingBoxSchema,
  geoJsonSchema,
]);

export type SpatialValue = z.infer<typeof spatialSchema>;

/** Parse a spatial string — may be JSON or plain text. */
export function parseSpatial(value: string): SpatialValue {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Check if a bounding box intersects another. */
export function bboxIntersects(
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean {
  // a and b are [west, south, east, north]
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

/** Extract a bounding box from a spatial value, or return null. */
export function extractBbox(
  value: SpatialValue
): [number, number, number, number] | null {
  if (typeof value === "string") return null;

  if ("coordinates" in value && value.type === "BoundingBox") {
    return value.coordinates as [number, number, number, number];
  }

  // For GeoJSON, compute a rough bbox
  if (typeof value === "object" && value !== null) {
    try {
      const coords = extractAllCoordinates(value);
      if (coords.length === 0) return null;
      const lons = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      return [
        Math.min(...lons),
        Math.min(...lats),
        Math.max(...lons),
        Math.max(...lats),
      ];
    } catch {
      return null;
    }
  }

  return null;
}

function extractAllCoordinates(obj: unknown): [number, number][] {
  if (!obj || typeof obj !== "object") return [];
  const coords: [number, number][] = [];

  if (Array.isArray(obj)) {
    if (obj.length >= 2 && typeof obj[0] === "number" && typeof obj[1] === "number") {
      coords.push([obj[0], obj[1]]);
    } else {
      for (const item of obj) {
        coords.push(...extractAllCoordinates(item));
      }
    }
  } else {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      coords.push(...extractAllCoordinates(val));
    }
  }

  return coords;
}
