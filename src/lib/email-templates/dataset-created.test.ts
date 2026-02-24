import { describe, it, expect } from "vitest";
import { datasetCreatedEmail } from "./dataset-created";

describe("datasetCreatedEmail", () => {
  const params = {
    title: "Climate Data 2024",
    datasetUrl: "https://example.com/datasets/climate-data-2024",
    publisherName: "EPA",
  };

  it("returns subject, html, and text", () => {
    const result = datasetCreatedEmail(params);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("html");
    expect(result).toHaveProperty("text");
  });

  it("includes dataset title in subject", () => {
    const result = datasetCreatedEmail(params);
    expect(result.subject).toContain("Climate Data 2024");
  });

  it("includes dataset URL in html", () => {
    const result = datasetCreatedEmail(params);
    expect(result.html).toContain(params.datasetUrl);
  });

  it("includes publisher name in html", () => {
    const result = datasetCreatedEmail(params);
    expect(result.html).toContain("EPA");
  });
});
