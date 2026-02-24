import { describe, it, expect } from "vitest";
import { datasetUpdatedEmail } from "./dataset-updated";

describe("datasetUpdatedEmail", () => {
  const params = {
    title: "Climate Data 2024",
    datasetUrl: "https://example.com/datasets/climate-data-2024",
    changedFields: ["title", "description"],
  };

  it("includes dataset title in subject", () => {
    const result = datasetUpdatedEmail(params);
    expect(result.subject).toContain("Climate Data 2024");
  });

  it("includes changed fields in html", () => {
    const result = datasetUpdatedEmail(params);
    expect(result.html).toContain("title");
    expect(result.html).toContain("description");
  });

  it("includes changed fields in text", () => {
    const result = datasetUpdatedEmail(params);
    expect(result.text).toContain("title");
    expect(result.text).toContain("description");
  });
});
