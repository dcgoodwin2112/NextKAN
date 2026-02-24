import { describe, it, expect } from "vitest";
import { parseSpatial, bboxIntersects, extractBbox } from "./spatial";

describe("parseSpatial", () => {
  it("returns plain text as-is", () => {
    expect(parseSpatial("United States")).toBe("United States");
  });

  it("parses a JSON bounding box", () => {
    const input = JSON.stringify({
      type: "BoundingBox",
      coordinates: [-77.5, 38.8, -76.9, 39.1],
    });
    expect(parseSpatial(input)).toEqual({
      type: "BoundingBox",
      coordinates: [-77.5, 38.8, -76.9, 39.1],
    });
  });

  it("parses GeoJSON", () => {
    const input = JSON.stringify({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-77.0, 38.9] },
    });
    const result = parseSpatial(input);
    expect(result).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-77.0, 38.9] },
    });
  });

  it("returns string for invalid JSON", () => {
    expect(parseSpatial("{bad json")).toBe("{bad json");
  });
});

describe("bboxIntersects", () => {
  it("returns true for overlapping boxes", () => {
    expect(
      bboxIntersects([-10, -10, 10, 10], [-5, -5, 5, 5])
    ).toBe(true);
  });

  it("returns false when box A is east of box B", () => {
    expect(
      bboxIntersects([20, 0, 30, 10], [0, 0, 10, 10])
    ).toBe(false);
  });

  it("returns false when box A is north of box B", () => {
    expect(
      bboxIntersects([0, 20, 10, 30], [0, 0, 10, 10])
    ).toBe(false);
  });

  it("returns true when one box is contained within the other", () => {
    expect(
      bboxIntersects([-100, -100, 100, 100], [-1, -1, 1, 1])
    ).toBe(true);
  });

  it("returns true for edge-touching boxes", () => {
    expect(
      bboxIntersects([0, 0, 10, 10], [10, 0, 20, 10])
    ).toBe(true);
  });
});

describe("extractBbox", () => {
  it("extracts coordinates from a BoundingBox object", () => {
    expect(
      extractBbox({
        type: "BoundingBox",
        coordinates: [-77.5, 38.8, -76.9, 39.1],
      })
    ).toEqual([-77.5, 38.8, -76.9, 39.1]);
  });

  it("computes bbox from a GeoJSON Point", () => {
    const result = extractBbox({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-77.0, 38.9] },
    });
    expect(result).toEqual([-77.0, 38.9, -77.0, 38.9]);
  });

  it("computes bbox from a GeoJSON Polygon", () => {
    const result = extractBbox({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-77.5, 38.8],
            [-76.9, 38.8],
            [-76.9, 39.1],
            [-77.5, 39.1],
            [-77.5, 38.8],
          ],
        ],
      },
    });
    expect(result).toEqual([-77.5, 38.8, -76.9, 39.1]);
  });

  it("returns null for plain text", () => {
    expect(extractBbox("United States")).toBeNull();
  });

  it("returns null for GeoJSON with no coordinates", () => {
    expect(
      extractBbox({ type: "Feature", geometry: { type: "Point", coordinates: [] } })
    ).toBeNull();
  });
});
