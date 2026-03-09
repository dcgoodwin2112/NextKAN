import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedPages(prisma: PrismaClient) {
  const aboutPage = await prisma.page.upsert({
    where: { slug: "about" },
    update: {},
    create: {
      title: "About This Catalog",
      slug: "about",
      published: true,
      navLocation: "header",
      template: "default",
      metaTitle: "About - Open Data Catalog",
      metaDescription:
        "Learn about our open data catalog and its mission to provide transparent access to public data.",
      content: `# About This Catalog

Welcome to our open data catalog — a centralized platform for discovering, accessing, and using public datasets published by government agencies and partner organizations.

## Our Mission

We believe in the power of open data to drive transparency, innovation, and informed decision-making. This catalog makes it easy for researchers, developers, journalists, and the public to find and use government data.

## What You'll Find

- **Environmental Data** — Air quality, water quality, and energy consumption datasets updated regularly
- **Public Safety** — Crime statistics, traffic accident reports, and emergency response data
- **Health & Human Services** — Hospital performance, chronic disease statistics, and public health indicators
- **Municipal Operations** — Budget data, infrastructure inventories, and parks information
- **Transportation** — Road conditions, traffic patterns, and transit system data

## Standards & Compliance

All datasets conform to the [DCAT-US v1.1 metadata schema](https://resources.data.gov/resources/dcat-us/), ensuring interoperability with Data.gov and other federal data portals.

## Contact

Have questions or suggestions? Reach out to our open data team at opendata@example.gov.
`,
    },
  });

  const policyPage = await prisma.page.upsert({
    where: { slug: "data-policy" },
    update: {},
    create: {
      title: "Data Policy",
      slug: "data-policy",
      published: true,
      navLocation: "footer",
      template: "full-width",
      metaTitle: "Data Policy - Open Data Catalog",
      metaDescription:
        "Our policies governing the publication and use of open data.",
      content: `# Data Policy

## Open Data Principles

Our catalog operates under the following open data principles:

1. **Public by Default** — Government data should be open and available unless there are legitimate privacy or security concerns
2. **Accessible** — Data is available in machine-readable formats with well-documented APIs
3. **Timely** — Datasets are updated on their stated schedules
4. **Reusable** — Open licenses allow free use, modification, and redistribution

## Data Quality Standards

All published datasets must meet minimum quality standards:

- Complete and accurate metadata (title, description, contact, license)
- At least one distribution in a machine-readable format (CSV, JSON, XML)
- Regular update schedule documented in metadata
- Valid contact information for data stewards

## Privacy & Security

- Personally identifiable information (PII) is removed or anonymized before publication
- Datasets undergo review before being made public
- Security-sensitive data is classified as "restricted public" or "non-public"

## Licensing

Unless otherwise stated, datasets are published under the [Creative Commons Zero (CC0 1.0)](https://creativecommons.org/publicdomain/zero/1.0/) public domain dedication.
`,
    },
  });

  await prisma.page.upsert({
    where: { slug: "api-guide" },
    update: {},
    create: {
      title: "How to Use the API",
      slug: "api-guide",
      published: true,
      navLocation: "header",
      template: "sidebar",
      sortOrder: 1,
      metaTitle: "API Guide - Open Data Catalog",
      metaDescription:
        "Learn how to use our REST API to programmatically access open data.",
      content: `# How to Use the API

Our catalog provides a RESTful API for programmatic access to datasets and metadata.

## Endpoints

### Data.json (DCAT-US Catalog)

\`\`\`
GET /data.json
\`\`\`

Returns the full catalog in DCAT-US v1.1 format. This is the primary endpoint consumed by Data.gov harvesters.

### Dataset Search

\`\`\`
GET /api/datasets?q=air+quality&theme=climate&page=1
\`\`\`

Search datasets with filters for keyword, theme, organization, and format.

### Dataset Details

\`\`\`
GET /api/datasets/:id
\`\`\`

Returns full metadata for a single dataset, including distributions.

### CKAN-Compatible API

For compatibility with existing CKAN clients:

\`\`\`
GET /api/3/action/package_list
GET /api/3/action/package_show?id=<slug>
GET /api/3/action/package_search?q=<query>
\`\`\`

## Authentication

Public endpoints require no authentication. Write operations require an API token passed as a Bearer token:

\`\`\`
Authorization: Bearer nkan_your_token_here
\`\`\`

## Rate Limits

There are currently no rate limits on API access. Please be respectful with automated queries.
`,
    },
  });

  await prisma.page.upsert({
    where: { slug: "terms-of-service" },
    update: {},
    create: {
      title: "Terms of Service",
      slug: "terms-of-service",
      published: true,
      navLocation: "footer",
      template: "default",
      sortOrder: 1,
      parentId: policyPage.id,
      metaTitle: "Terms of Service - Open Data Catalog",
      metaDescription: "Terms governing the use of our open data catalog.",
      content: `# Terms of Service

By accessing and using this open data catalog, you agree to the following terms.

## Acceptable Use

- Data may be used for any lawful purpose
- Attribution is appreciated but not required for CC0-licensed data
- Automated access should follow reasonable request patterns
- Do not attempt to re-identify anonymized data

## Disclaimers

- Data is provided "as is" without warranty of any kind
- We make reasonable efforts to ensure accuracy but cannot guarantee data completeness
- Datasets may be modified or removed without notice
- Historical data availability is not guaranteed

## API Usage

- API access is provided free of charge
- We reserve the right to implement rate limiting if necessary
- API endpoints and response formats may change; check the API documentation for current specifications

## Contact

For questions about these terms, contact legal@example.gov.
`,
    },
  });

  console.log("Seed: 4 pages created");
}
