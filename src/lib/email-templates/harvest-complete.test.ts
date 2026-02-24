import { describe, it, expect } from "vitest";
import { harvestCompleteEmail } from "./harvest-complete";

describe("harvestCompleteEmail", () => {
  it("includes source name in subject", () => {
    const result = harvestCompleteEmail({
      sourceName: "Data.gov",
      status: "success",
      created: 5,
      updated: 3,
      deleted: 0,
      errors: 0,
    });
    expect(result.subject).toContain("Data.gov");
  });

  it("indicates success when no errors", () => {
    const result = harvestCompleteEmail({
      sourceName: "Data.gov",
      status: "success",
      created: 5,
      updated: 3,
      deleted: 0,
      errors: 0,
    });
    expect(result.subject).toContain("completed successfully");
  });

  it("indicates errors when present", () => {
    const result = harvestCompleteEmail({
      sourceName: "Data.gov",
      status: "partial",
      created: 2,
      updated: 0,
      deleted: 0,
      errors: 1,
    });
    expect(result.subject).toContain("with errors");
  });

  it("includes counts in html", () => {
    const result = harvestCompleteEmail({
      sourceName: "Data.gov",
      status: "success",
      created: 5,
      updated: 3,
      deleted: 1,
      errors: 0,
    });
    expect(result.html).toContain("5");
    expect(result.html).toContain("3");
  });
});
