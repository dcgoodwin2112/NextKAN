import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import { handleApiError, unauthorized, notFound } from "./api";

describe("handleApiError", () => {
  it("returns 400 with field errors for ZodError", async () => {
    const zodError = new ZodError([
      {
        code: "invalid_type",
        expected: "string",
        received: "undefined",
        path: ["title"],
        message: "Required",
      },
    ]);
    const response = handleApiError(zodError);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 500 for generic Error", async () => {
    const response = handleApiError(new Error("Something broke"));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error).toBe("Something broke");
  });
});

describe("unauthorized", () => {
  it("returns 401", async () => {
    const response = unauthorized();
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

describe("notFound", () => {
  it("returns 404 with resource name", async () => {
    const response = notFound("Dataset");
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error).toBe("Dataset not found");
  });
});
