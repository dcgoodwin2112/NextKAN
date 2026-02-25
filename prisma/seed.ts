import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { readFile } from "fs/promises";
import Database from "better-sqlite3";
import path from "path";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const DEFAULT_THEMES = [
  { name: "Agriculture", slug: "agriculture", color: "#4CAF50" },
  { name: "Business", slug: "business", color: "#2196F3" },
  { name: "Climate", slug: "climate", color: "#00BCD4" },
  { name: "Consumer", slug: "consumer", color: "#FF9800" },
  { name: "Ecosystems", slug: "ecosystems", color: "#8BC34A" },
  { name: "Education", slug: "education", color: "#9C27B0" },
  { name: "Energy", slug: "energy", color: "#FFC107" },
  { name: "Finance", slug: "finance", color: "#607D8B" },
  { name: "Health", slug: "health", color: "#F44336" },
  { name: "Local Government", slug: "local-government", color: "#3F51B5" },
  { name: "Manufacturing", slug: "manufacturing", color: "#795548" },
  { name: "Maritime", slug: "maritime", color: "#03A9F4" },
  { name: "Ocean", slug: "ocean", color: "#0097A7" },
  { name: "Public Safety", slug: "public-safety", color: "#E91E63" },
  { name: "Science & Research", slug: "science-research", color: "#673AB7" },
  { name: "Transportation", slug: "transportation", color: "#FF5722" },
];

// --- Datastore helpers (mirrored from src/lib/services/datastore.ts) ---

interface DatastoreColumn {
  name: string;
  type: "TEXT" | "INTEGER" | "REAL" | "BOOLEAN";
}

function sanitizeColumnName(raw: string): string {
  let name = raw
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (!name || /^\d/.test(name)) {
    name = `col_${name}`;
  }

  return name.toLowerCase();
}

function inferColumnTypes(
  columns: string[],
  sampleRows: Record<string, string>[]
): DatastoreColumn[] {
  const sample = sampleRows.slice(0, 100);

  return columns.map((rawName) => {
    const name = sanitizeColumnName(rawName);
    const values = sample
      .map((row) => row[rawName])
      .filter((v) => v !== undefined && v !== null && v !== "");

    if (values.length === 0) {
      return { name, type: "TEXT" as const };
    }

    const allBoolean = values.every((v) =>
      ["true", "false", "0", "1", "yes", "no"].includes(v.toLowerCase())
    );
    if (allBoolean) return { name, type: "BOOLEAN" as const };

    const allInteger = values.every((v) => /^-?\d+$/.test(v));
    if (allInteger) return { name, type: "INTEGER" as const };

    const allReal = values.every((v) => /^-?\d+(\.\d+)?$/.test(v));
    if (allReal) return { name, type: "REAL" as const };

    return { name, type: "TEXT" as const };
  });
}

function generateTableName(distributionId: string): string {
  const hex = distributionId.replace(/-/g, "").slice(0, 8);
  return `ds_${hex}`;
}

const datastoreTypeToDictType: Record<string, string> = {
  TEXT: "string",
  INTEGER: "integer",
  REAL: "number",
  BOOLEAN: "boolean",
};

async function importSeedCsvs(): Promise<void> {
  const distributions = await prisma.distribution.findMany({
    where: {
      mediaType: "text/csv",
      filePath: { not: null },
    },
  });

  let imported = 0;

  for (const dist of distributions) {
    // Skip if already imported (idempotent)
    const existing = await prisma.datastoreTable.findUnique({
      where: { distributionId: dist.id },
    });
    if (existing) continue;

    const filePath = path.resolve(dist.filePath!);
    let fileContent: string;
    try {
      fileContent = await readFile(filePath, "utf-8");
    } catch {
      console.warn(`Seed: skipping ${dist.fileName} — file not found at ${filePath}`);
      continue;
    }

    const parsed = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    const rawColumns = parsed.meta.fields ?? [];
    if (rawColumns.length === 0) continue;

    const columns = inferColumnTypes(rawColumns, parsed.data);

    // Deduplicate sanitized column names
    const seen = new Map<string, number>();
    for (const col of columns) {
      const count = seen.get(col.name) ?? 0;
      if (count > 0) {
        col.name = `${col.name}_${count}`;
      }
      seen.set(col.name, count + 1);
    }

    const tableName = generateTableName(dist.id);
    const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
    const dbPath = dbUrl.replace(/^file:/, "");
    const db = new Database(dbPath);

    try {
      // Create table
      const colDefs = columns
        .map((c) => `"${c.name}" ${c.type}`)
        .join(", ");
      db.exec(
        `CREATE TABLE IF NOT EXISTS "${tableName}" (_rowid INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs})`
      );

      // Batch insert
      const maxPerBatch = Math.min(
        Math.floor(999 / columns.length),
        1000
      );
      const insertCols = columns.map((c) => `"${c.name}"`).join(", ");
      const rows = parsed.data;

      for (let i = 0; i < rows.length; i += maxPerBatch) {
        const batch = rows.slice(i, i + maxPerBatch);
        const placeholders = batch
          .map(() => `(${columns.map(() => "?").join(", ")})`)
          .join(", ");

        const values: unknown[] = [];
        for (const row of batch) {
          for (let ci = 0; ci < rawColumns.length; ci++) {
            const rawVal = row[rawColumns[ci]] ?? null;
            const col = columns[ci];

            if (rawVal === null || rawVal === "") {
              values.push(null);
            } else if (col.type === "INTEGER") {
              values.push(parseInt(rawVal, 10));
            } else if (col.type === "REAL") {
              values.push(parseFloat(rawVal));
            } else if (col.type === "BOOLEAN") {
              values.push(
                ["true", "1", "yes"].includes(rawVal.toLowerCase()) ? 1 : 0
              );
            } else {
              values.push(rawVal);
            }
          }
        }

        db.prepare(
          `INSERT INTO "${tableName}" (${insertCols}) VALUES ${placeholders}`
        ).run(...values);
      }

      // Create DatastoreTable record
      await prisma.datastoreTable.create({
        data: {
          distributionId: dist.id,
          tableName,
          columns: JSON.stringify(columns),
          rowCount: rows.length,
          status: "ready",
        },
      });

      // Create DataDictionary + fields
      const existingDict = await prisma.dataDictionary.findUnique({
        where: { distributionId: dist.id },
      });
      if (existingDict) {
        await prisma.dataDictionary.delete({ where: { id: existingDict.id } });
      }

      await prisma.dataDictionary.create({
        data: {
          distributionId: dist.id,
          fields: {
            create: columns.map((col, index) => ({
              name: col.name,
              type: datastoreTypeToDictType[col.type] || "string",
              sortOrder: index,
            })),
          },
        },
      });

      imported++;
    } finally {
      db.close();
    }
  }

  console.log(`Seed: ${imported} datastore tables imported`);
}

async function main() {
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "changeme",
    12
  );

  // --- Admin user ---
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@example.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      password: hashedPassword,
      name: "Admin",
      role: "admin",
    },
  });

  // --- Themes ---
  for (const theme of DEFAULT_THEMES) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: {},
      create: theme,
    });
  }

  console.log("Seed: admin user + 16 themes created");

  // --- Organizations ---
  const springfield = await prisma.organization.upsert({
    where: { slug: "city-of-springfield" },
    update: {},
    create: {
      name: "City of Springfield",
      slug: "city-of-springfield",
      description:
        "The municipal government of Springfield, providing open data on city services, budgets, infrastructure, and public safety.",
      imageUrl: "https://example.com/logos/springfield.png",
    },
  });

  const springfieldDot = await prisma.organization.upsert({
    where: { slug: "springfield-dept-of-transportation" },
    update: {},
    create: {
      name: "Springfield Dept of Transportation",
      slug: "springfield-dept-of-transportation",
      description:
        "Responsible for maintaining and improving Springfield's roads, bridges, and transit systems.",
      parentId: springfield.id,
    },
  });

  const envAgency = await prisma.organization.upsert({
    where: { slug: "state-environmental-agency" },
    update: {},
    create: {
      name: "State Environmental Agency",
      slug: "state-environmental-agency",
      description:
        "Monitors environmental conditions including air quality, water quality, and energy consumption across the state.",
    },
  });

  const healthInstitute = await prisma.organization.upsert({
    where: { slug: "national-health-institute" },
    update: {},
    create: {
      name: "National Health Institute",
      slug: "national-health-institute",
      description:
        "Federal agency conducting and supporting medical research and publishing public health statistics.",
    },
  });

  // --- Users ---
  await prisma.user.upsert({
    where: { email: "orgadmin@example.com" },
    update: {},
    create: {
      email: "orgadmin@example.com",
      password: hashedPassword,
      name: "Jane Mitchell",
      role: "orgAdmin",
      organizationId: springfield.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "editor@example.com" },
    update: {},
    create: {
      email: "editor@example.com",
      password: hashedPassword,
      name: "Carlos Rivera",
      role: "editor",
      organizationId: springfieldDot.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "editor2@example.com" },
    update: {},
    create: {
      email: "editor2@example.com",
      password: hashedPassword,
      name: "Priya Sharma",
      role: "editor",
      organizationId: envAgency.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      email: "viewer@example.com",
      password: hashedPassword,
      name: "David Chen",
      role: "viewer",
      organizationId: healthInstitute.id,
    },
  });

  console.log("Seed: 4 organizations + 4 users created");

  // --- Fetch theme IDs ---
  const themes = await prisma.theme.findMany();
  const themeMap = new Map(themes.map((t) => [t.slug, t.id]));

  // --- Dataset definitions ---
  interface SeedDataset {
    slug: string;
    title: string;
    description: string;
    publisherId: string;
    contactName: string;
    contactEmail: string;
    status: string;
    workflowStatus: string;
    accessLevel: string;
    license?: string;
    temporal?: string;
    spatial?: string;
    accrualPeriodicity?: string;
    bureauCode?: string;
    programCode?: string;
    landingPage?: string;
    issued?: Date;
    language?: string;
    keywords: string[];
    themeSlugs: string[];
    distributions: {
      title: string;
      downloadURL: string;
      mediaType: string;
      format: string;
      description?: string;
      filePath?: string;
      fileName?: string;
      fileSize?: number;
    }[];
  }

  const datasets: SeedDataset[] = [
    {
      slug: "annual-budget-data",
      title: "Annual Budget Data",
      description:
        "Comprehensive municipal budget data including revenues, expenditures, and fund balances for all city departments. Updated annually after budget approval.",
      publisherId: springfield.id,
      contactName: "Jane Mitchell",
      contactEmail: "budget@springfield.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      temporal: "2019-01-01/2024-12-31",
      accrualPeriodicity: "R/P1Y",
      landingPage: "https://springfield.gov/finance/budget",
      issued: new Date("2019-06-15"),
      language: "en",
      keywords: ["budget", "finance", "expenditures", "revenue", "municipal"],
      themeSlugs: ["finance"],
      distributions: [
        {
          title: "Budget Data (CSV)",
          downloadURL: "/sample-data/annual-budget.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/annual-budget.csv",
          fileName: "annual-budget.csv",
          fileSize: 1054,
        },
        {
          title: "Budget Data (JSON)",
          downloadURL: "/sample-data/annual-budget.json",
          mediaType: "application/json",
          format: "JSON",
        },
      ],
    },
    {
      slug: "traffic-accident-reports",
      title: "Traffic Accident Reports",
      description:
        "Geocoded traffic accident reports including location, severity, contributing factors, and vehicle types. Updated monthly from police reports.",
      publisherId: springfieldDot.id,
      contactName: "Carlos Rivera",
      contactEmail: "traffic@springfield-dot.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      temporal: "2020-01-01/2024-12-31",
      spatial: '{"type":"Point","coordinates":[-89.6501,39.7817]}',
      accrualPeriodicity: "R/P1M",
      issued: new Date("2020-03-01"),
      language: "en",
      keywords: [
        "traffic",
        "accidents",
        "safety",
        "transportation",
        "crashes",
      ],
      themeSlugs: ["transportation", "public-safety"],
      distributions: [
        {
          title: "Accident Reports (CSV)",
          downloadURL: "/sample-data/traffic-accidents.csv",
          mediaType: "text/csv",
          format: "CSV",
          description:
            "All reported traffic accidents with location coordinates and severity ratings.",
          filePath: "public/sample-data/traffic-accidents.csv",
          fileName: "traffic-accidents.csv",
          fileSize: 1748,
        },
      ],
    },
    {
      slug: "air-quality-monitoring",
      title: "Air Quality Monitoring Stations",
      description:
        "Daily air quality index readings from monitoring stations across the state, including PM2.5, ozone, and NO2 concentrations.",
      publisherId: envAgency.id,
      contactName: "Priya Sharma",
      contactEmail: "airquality@state-env.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/licenses/by/4.0/",
      temporal: "2018-01-01/2024-12-31",
      accrualPeriodicity: "R/P1D",
      issued: new Date("2018-05-01"),
      language: "en",
      keywords: [
        "air quality",
        "pollution",
        "PM2.5",
        "ozone",
        "environment",
        "monitoring",
      ],
      themeSlugs: ["climate", "ecosystems"],
      distributions: [
        {
          title: "Air Quality Data (CSV)",
          downloadURL: "/sample-data/air-quality.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/air-quality.csv",
          fileName: "air-quality.csv",
          fileSize: 1277,
        },
        {
          title: "Air Quality Data (JSON API)",
          downloadURL: "/sample-data/air-quality.csv",
          mediaType: "application/json",
          format: "JSON",
        },
      ],
    },
    {
      slug: "public-school-performance",
      title: "Public School Performance Metrics",
      description:
        "Annual school-level performance data including test scores, graduation rates, attendance, and demographic breakdowns for all public schools in Springfield.",
      publisherId: springfield.id,
      contactName: "Jane Mitchell",
      contactEmail: "education@springfield.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      temporal: "2019-01-01/2024-06-30",
      accrualPeriodicity: "R/P1Y",
      issued: new Date("2019-09-01"),
      language: "en",
      keywords: [
        "education",
        "schools",
        "test scores",
        "graduation rates",
        "performance",
      ],
      themeSlugs: ["education"],
      distributions: [
        {
          title: "School Performance (CSV)",
          downloadURL: "/sample-data/school-performance.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/school-performance.csv",
          fileName: "school-performance.csv",
          fileSize: 874,
        },
        {
          // PDF placeholder — no real file generated
          title: "School Report Cards (PDF)",
          downloadURL: "https://example.com/data/school-report-cards.pdf",
          mediaType: "application/pdf",
          format: "PDF",
        },
      ],
    },
    {
      slug: "hospital-readmission-rates",
      title: "Hospital Readmission Rates",
      description:
        "30-day readmission rates by hospital and condition for facilities nationwide. Includes risk-adjusted rates and comparison benchmarks.",
      publisherId: healthInstitute.id,
      contactName: "David Chen",
      contactEmail: "data@nih.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      accrualPeriodicity: "R/P1Y",
      bureauCode: "009:00",
      programCode: "009:076",
      issued: new Date("2021-01-15"),
      language: "en",
      keywords: [
        "health",
        "hospitals",
        "readmissions",
        "quality of care",
        "medicare",
      ],
      themeSlugs: ["health"],
      distributions: [
        {
          title: "Readmission Rates (CSV)",
          downloadURL: "/sample-data/readmission-rates.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/readmission-rates.csv",
          fileName: "readmission-rates.csv",
          fileSize: 893,
        },
      ],
    },
    {
      slug: "water-quality-testing-results",
      title: "Water Quality Testing Results",
      description:
        "Monthly water quality test results from rivers, lakes, and reservoirs including pH, dissolved oxygen, turbidity, and contaminant levels.",
      publisherId: envAgency.id,
      contactName: "Priya Sharma",
      contactEmail: "waterquality@state-env.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/licenses/by/4.0/",
      temporal: "2017-01-01/2024-12-31",
      accrualPeriodicity: "R/P1M",
      issued: new Date("2017-04-01"),
      language: "en",
      keywords: [
        "water quality",
        "testing",
        "contaminants",
        "rivers",
        "lakes",
        "environment",
      ],
      themeSlugs: ["climate"],
      distributions: [
        {
          title: "Water Quality Data (CSV)",
          downloadURL: "/sample-data/water-quality.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/water-quality.csv",
          fileName: "water-quality.csv",
          fileSize: 1299,
        },
      ],
    },
    {
      slug: "city-parks-recreation-areas",
      title: "City Parks & Recreation Areas",
      description:
        "Inventory of all public parks, playgrounds, trails, and recreation facilities including amenities, acreage, and GeoJSON boundaries.",
      publisherId: springfield.id,
      contactName: "Jane Mitchell",
      contactEmail: "parks@springfield.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      spatial:
        '{"type":"Polygon","coordinates":[[[-89.75,39.70],[-89.55,39.70],[-89.55,39.85],[-89.75,39.85],[-89.75,39.70]]]}',
      issued: new Date("2022-03-15"),
      language: "en",
      keywords: [
        "parks",
        "recreation",
        "trails",
        "green space",
        "facilities",
      ],
      themeSlugs: ["ecosystems"],
      distributions: [
        {
          title: "Parks Inventory (GeoJSON)",
          downloadURL: "/sample-data/parks.geojson",
          mediaType: "application/geo+json",
          format: "GeoJSON",
        },
        {
          // PDF placeholder — no real file generated
          title: "Parks Guide (PDF)",
          downloadURL: "https://example.com/data/parks-guide.pdf",
          mediaType: "application/pdf",
          format: "PDF",
        },
      ],
    },
    {
      slug: "road-infrastructure-inventory",
      title: "Road Infrastructure Inventory",
      description:
        "Complete inventory of roads, bridges, and tunnels including condition ratings, last inspection dates, and maintenance schedules.",
      publisherId: springfieldDot.id,
      contactName: "Carlos Rivera",
      contactEmail: "infrastructure@springfield-dot.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      accrualPeriodicity: "R/P6M",
      issued: new Date("2021-07-01"),
      language: "en",
      keywords: [
        "roads",
        "bridges",
        "infrastructure",
        "maintenance",
        "condition ratings",
      ],
      themeSlugs: ["transportation"],
      distributions: [
        {
          title: "Infrastructure Data (CSV)",
          downloadURL: "/sample-data/road-infrastructure.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/road-infrastructure.csv",
          fileName: "road-infrastructure.csv",
          fileSize: 1128,
        },
      ],
    },
    {
      slug: "chronic-disease-statistics",
      title: "Chronic Disease Statistics",
      description:
        "National statistics on chronic disease prevalence, mortality, and risk factors. Broken down by age group, sex, and geographic region.",
      publisherId: healthInstitute.id,
      contactName: "David Chen",
      contactEmail: "chronic-disease@nih.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      accrualPeriodicity: "R/P1Y",
      bureauCode: "009:00",
      programCode: "009:076",
      issued: new Date("2020-06-01"),
      language: "en",
      keywords: [
        "chronic disease",
        "diabetes",
        "heart disease",
        "mortality",
        "public health",
      ],
      themeSlugs: ["health", "science-research"],
      distributions: [
        {
          title: "Disease Statistics (CSV)",
          downloadURL: "/sample-data/chronic-disease.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/chronic-disease.csv",
          fileName: "chronic-disease.csv",
          fileSize: 872,
        },
        {
          title: "Disease Statistics (JSON)",
          downloadURL: "/sample-data/chronic-disease.json",
          mediaType: "application/json",
          format: "JSON",
        },
      ],
    },
    {
      slug: "energy-consumption-by-sector",
      title: "Energy Consumption by Sector",
      description:
        "Annual energy consumption data broken down by sector (residential, commercial, industrial, transportation) including renewable vs. fossil fuel mix.",
      publisherId: envAgency.id,
      contactName: "Priya Sharma",
      contactEmail: "energy@state-env.gov",
      status: "published",
      workflowStatus: "published",
      accessLevel: "public",
      license: "https://creativecommons.org/licenses/by/4.0/",
      temporal: "2015-01-01/2024-12-31",
      accrualPeriodicity: "R/P1Y",
      issued: new Date("2015-12-01"),
      language: "en",
      keywords: [
        "energy",
        "consumption",
        "renewable",
        "fossil fuels",
        "sectors",
      ],
      themeSlugs: ["energy", "climate"],
      distributions: [
        {
          title: "Energy Consumption (CSV)",
          downloadURL: "/sample-data/energy-consumption.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/energy-consumption.csv",
          fileName: "energy-consumption.csv",
          fileSize: 721,
        },
      ],
    },
    {
      slug: "crime-statistics-by-district",
      title: "Crime Statistics by District",
      description:
        "Monthly crime incident reports aggregated by police district, including offense type, location, and time of day. Draft pending review.",
      publisherId: springfield.id,
      contactName: "Jane Mitchell",
      contactEmail: "safety@springfield.gov",
      status: "draft",
      workflowStatus: "draft",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      temporal: "2022-01-01/2024-12-31",
      accrualPeriodicity: "R/P1M",
      language: "en",
      keywords: [
        "crime",
        "public safety",
        "police",
        "incidents",
        "districts",
      ],
      themeSlugs: ["public-safety"],
      distributions: [
        {
          title: "Crime Statistics (CSV)",
          downloadURL: "/sample-data/crime-statistics.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/crime-statistics.csv",
          fileName: "crime-statistics.csv",
          fileSize: 621,
        },
      ],
    },
    {
      slug: "workforce-development-survey",
      title: "Workforce Development Survey Results",
      description:
        "Survey data on workforce training program outcomes, employment rates, and skills gaps. Currently in preparation for publication.",
      publisherId: springfield.id,
      contactName: "Jane Mitchell",
      contactEmail: "workforce@springfield.gov",
      status: "draft",
      workflowStatus: "pending_review",
      accessLevel: "public",
      license: "https://creativecommons.org/publicdomain/zero/1.0/",
      temporal: "2023-01-01/2023-12-31",
      accrualPeriodicity: "R/P1Y",
      issued: new Date("2024-02-15"),
      language: "en",
      keywords: [
        "workforce",
        "employment",
        "training",
        "skills",
        "survey",
        "economic development",
      ],
      themeSlugs: ["business"],
      distributions: [
        {
          title: "Survey Results (CSV)",
          downloadURL: "/sample-data/workforce-survey.csv",
          mediaType: "text/csv",
          format: "CSV",
          filePath: "public/sample-data/workforce-survey.csv",
          fileName: "workforce-survey.csv",
          fileSize: 635,
        },
        {
          // PDF placeholder — no real file generated
          title: "Survey Report (PDF)",
          downloadURL: "https://example.com/data/workforce-report.pdf",
          mediaType: "application/pdf",
          format: "PDF",
        },
      ],
    },
  ];

  // --- Create datasets with nested keywords + distributions ---
  for (const ds of datasets) {
    const dataset = await prisma.dataset.upsert({
      where: { slug: ds.slug },
      update: {},
      create: {
        slug: ds.slug,
        title: ds.title,
        description: ds.description,
        publisherId: ds.publisherId,
        contactName: ds.contactName,
        contactEmail: ds.contactEmail,
        status: ds.status,
        workflowStatus: ds.workflowStatus,
        accessLevel: ds.accessLevel,
        license: ds.license,
        temporal: ds.temporal,
        spatial: ds.spatial,
        accrualPeriodicity: ds.accrualPeriodicity,
        bureauCode: ds.bureauCode,
        programCode: ds.programCode,
        landingPage: ds.landingPage,
        issued: ds.issued,
        language: ds.language,
        keywords: {
          create: ds.keywords.map((kw) => ({ keyword: kw })),
        },
        distributions: {
          create: ds.distributions.map((d) => ({
            title: d.title,
            downloadURL: d.downloadURL,
            mediaType: d.mediaType,
            format: d.format,
            description: d.description,
            filePath: d.filePath,
            fileName: d.fileName,
            fileSize: d.fileSize,
          })),
        },
      },
    });

    // Create theme associations
    for (const themeSlug of ds.themeSlugs) {
      const themeId = themeMap.get(themeSlug);
      if (themeId) {
        await prisma.datasetTheme.upsert({
          where: {
            datasetId_themeId: { datasetId: dataset.id, themeId },
          },
          update: {},
          create: { datasetId: dataset.id, themeId },
        });
      }
    }
  }

  console.log("Seed: 12 datasets with keywords, distributions, and themes created");

  // --- Import CSV data into datastore ---
  await importSeedCsvs();

  console.log("Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
