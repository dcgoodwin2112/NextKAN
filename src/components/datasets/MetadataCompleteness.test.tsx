import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataCompleteness } from "./MetadataCompleteness";

describe("MetadataCompleteness", () => {
  it("shows 100% for complete metadata", () => {
    const values = {
      title: "Test",
      description: "Desc",
      keywords: ["test"],
      publisherId: "pub-1",
      contactName: "John",
      contactEmail: "john@example.com",
      accessLevel: "public",
      license: "https://cc.org/zero",
      rights: "Public domain",
      spatial: "US",
      temporal: "2020/2024",
      accrualPeriodicity: "R/P1Y",
      landingPage: "https://example.com",
      issued: "2020-01-01",
      language: "en",
    };
    render(<MetadataCompleteness values={values} />);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("shows correct percentage for partial metadata", () => {
    const values = {
      title: "Test",
      description: "Desc",
      keywords: ["test"],
      publisherId: "pub-1",
      accessLevel: "public",
    };
    render(<MetadataCompleteness values={values} />);
    // 5 out of 15 = 33%
    expect(screen.getByText("33%")).toBeTruthy();
  });

  it("lists missing fields", () => {
    const values = {
      title: "Test",
      description: "Desc",
      keywords: ["test"],
      publisherId: "pub-1",
      accessLevel: "public",
    };
    render(<MetadataCompleteness values={values} />);
    expect(screen.getByText("Contact Name")).toBeTruthy();
    expect(screen.getByText("License")).toBeTruthy();
  });

  it("treats empty arrays as incomplete", () => {
    const values = {
      title: "Test",
      description: "Desc",
      keywords: [],
      publisherId: "pub-1",
      accessLevel: "public",
    };
    render(<MetadataCompleteness values={values} />);
    // keywords not counted as filled
    expect(screen.getByText("27%")).toBeTruthy();
  });
});
