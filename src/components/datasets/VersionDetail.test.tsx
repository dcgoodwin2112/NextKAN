import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VersionDetail } from "./VersionDetail";

const fullSnapshot = {
  "@type": "dcat:Dataset",
  title: "Census Data 2024",
  description: "Annual census data for the United States.",
  identifier: "CENSUS-2024-001",
  accessLevel: "public",
  modified: "2024-06-01",
  keyword: ["census", "population", "demographics"],
  theme: ["Government", "Demographics"],
  publisher: {
    "@type": "org:Organization",
    name: "Census Bureau",
    subOrganizationOf: {
      "@type": "org:Organization",
      name: "Department of Commerce",
    },
  },
  contactPoint: {
    "@type": "vcard:Contact",
    fn: "Jane Smith",
    hasEmail: "mailto:jane@census.gov",
  },
  temporal: "2024-01-01/2024-12-31",
  spatial: "United States",
  accrualPeriodicity: "R/P1Y",
  license: "https://creativecommons.org/publicdomain/zero/1.0/",
  distribution: [
    {
      "@type": "dcat:Distribution",
      title: "CSV Export",
      format: "CSV",
      downloadURL: "https://example.gov/census.csv",
    },
    {
      "@type": "dcat:Distribution",
      title: "JSON Export",
      format: "JSON",
      downloadURL: "https://example.gov/census.json",
    },
  ],
};

describe("VersionDetail", () => {
  it("renders core fields from snapshot", () => {
    render(<VersionDetail snapshot={fullSnapshot} />);

    expect(screen.getByText("Census Data 2024")).toBeInTheDocument();
    expect(
      screen.getByText("Annual census data for the United States.")
    ).toBeInTheDocument();
    expect(screen.getByText("CENSUS-2024-001")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
  });

  it("renders keywords as badges", () => {
    render(<VersionDetail snapshot={fullSnapshot} />);

    expect(screen.getByText("census")).toBeInTheDocument();
    expect(screen.getByText("population")).toBeInTheDocument();
    expect(screen.getByText("demographics")).toBeInTheDocument();
  });

  it("renders distributions table", () => {
    render(<VersionDetail snapshot={fullSnapshot} />);

    expect(screen.getByText("CSV Export")).toBeInTheDocument();
    expect(screen.getByText("JSON Export")).toBeInTheDocument();
    expect(
      screen.getByText("https://example.gov/census.csv")
    ).toBeInTheDocument();
  });

  it("handles missing optional fields", () => {
    const minimalSnapshot = {
      "@type": "dcat:Dataset",
      title: "Minimal Dataset",
      description: "No extras.",
      identifier: "MIN-001",
      accessLevel: "public",
      modified: "2024-01-01",
      keyword: [],
      publisher: { "@type": "org:Organization", name: "Test Agency" },
      contactPoint: {
        "@type": "vcard:Contact",
        fn: "Admin",
        hasEmail: "mailto:admin@test.gov",
      },
    };

    render(<VersionDetail snapshot={minimalSnapshot} />);

    expect(screen.getByText("Minimal Dataset")).toBeInTheDocument();
    // No distributions section rendered
    expect(screen.queryByText("Distributions")).not.toBeInTheDocument();
    // No keywords section rendered
    expect(screen.queryByText("Keywords")).not.toBeInTheDocument();
  });

  it("renders publisher with parent organization", () => {
    render(<VersionDetail snapshot={fullSnapshot} />);

    expect(screen.getByText("Census Bureau")).toBeInTheDocument();
    expect(screen.getByText("Department of Commerce")).toBeInTheDocument();
  });

  it("renders contact point", () => {
    render(<VersionDetail snapshot={fullSnapshot} />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(
      screen.getByText("mailto:jane@census.gov")
    ).toBeInTheDocument();
  });
});
