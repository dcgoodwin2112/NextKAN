# NextKAN — Prioritized Feature List

A lightweight, Next.js-based open data catalog designed as a modern alternative to CKAN and DKAN. Features are organized into priority tiers based on what's needed to ship a useful, DCAT-US compliant product versus what can be layered on over time.

---

## Research Summary

### DCAT-US Schema (v1.1 / v3.0 Draft)

DCAT-US is the federally mandated metadata standard for government data inventories. Agencies must publish a machine-readable `data.json` file at their root domain conforming to this schema. The schema defines three levels of fields:

- **Required (Always):** `title`, `description`, `keyword`, `modified`, `publisher`, `contactPoint`, `identifier`, `accessLevel`, `bureauCode` (federal only), `programCode` (federal only)
- **Required-if-Applicable:** `license`, `rights`, `spatial`, `temporal`, `distribution`
- **Expanded (Optional):** `accrualPeriodicity`, `conformsTo`, `dataQuality`, `describedBy`, `isPartOf`, `issued`, `language`, `landingPage`, `primaryITInvestmentUII`, `references`, `systemOfRecords`, `theme`

Each dataset can contain **distributions** (the actual downloadable resources), which carry their own fields: `accessURL`, `downloadURL`, `mediaType`, `format`, `title`, `description`, `conformsTo`, `describedBy`.

**DCAT-US v3.0** (draft) adds versioning, dataset series, inverse properties, improved geospatial support, and alignment with W3C DCAT 3 — but maintains backward compatibility with v1.1.

### CKAN Core Features

CKAN is the dominant open-source data catalog (Python/PostgreSQL/Solr). Key capabilities:

- Dataset and resource (distribution) management via web UI
- Full REST API for all CRUD operations
- DataStore — structured storage of tabular data (CSV) with SQL-like query API
- FileStore — file upload to server or cloud (S3, Azure via extensions)
- Full-text search powered by Apache Solr with faceted filtering
- Organizations and groups for dataset ownership/categorization
- Federation/harvesting between portals
- Data preview and visualization (tables, charts, maps, PDFs)
- Theming and branding customization
- Geospatial extensions (spatial search, map previews)
- Extensible plugin architecture (238+ community extensions)
- Activity streams and revision tracking
- User authentication and role-based access control

### DKAN Core Features

DKAN is built on Drupal and designed to be API-compatible with CKAN. Key capabilities:

- **Metastore** — DCAT-US compliant metadata management with custom JSON schema support
- **Datastore** — CSV parsing into queryable database tables with public API
- **Harvest** — import datasets from remote `data.json` endpoints
- **Data Dictionaries** — column-level metadata using Frictionless Data table schema
- Decoupled React frontend
- Workflow/editorial review before publishing
- Built-in charting and dashboard tools (DKAN Dash)
- Revision tracking and authoring information
- Search with faceted filtering
- API-first architecture

### Pain Points with Both Platforms

| Issue | Detail |
|-------|--------|
| **Heavy infrastructure** | CKAN requires Python, PostgreSQL, Solr, Redis. DKAN requires PHP, Drupal, MySQL. |
| **Slow setup** | Neither can be realistically running in under an hour for a new developer. |
| **Outdated frontend** | CKAN's Jinja templates and DKAN's Drupal theming feel dated. |
| **Steep learning curve** | Both have significant domain-specific knowledge requirements. |
| **Limited JS ecosystem** | Neither leverages the modern JS/React ecosystem natively. |

---

## Priority Tiers

### Tier 1 — MVP (Launch Blocker)

These features are the minimum needed to have a working, compliant data catalog.

| # | Feature | Description | Reference |
|---|---------|-------------|-----------|
| 1 | **DCAT-US v1.1 Compliant Metadata Schema** | Full implementation of required, required-if, and expanded dataset fields. JSON schema validation with Zod. | DCAT-US spec |
| 2 | **Dynamic `/data.json` Endpoint** | Auto-generated from database. This is the federally mandated machine-readable catalog file. Must always reflect current state. | DCAT-US / Data.gov requirement |
| 3 | **Dataset CRUD (Admin UI)** | Web-based forms to create, read, update, and delete dataset metadata records. Should handle the full DCAT-US field set with sensible defaults and conditional field display. | CKAN manage data, DKAN metastore |
| 4 | **Distribution/Resource Management** | Ability to attach one or more distributions (files/URLs) to a dataset, with `mediaType`, `format`, `downloadURL`/`accessURL` fields. | CKAN resources, DKAN distributions |
| 5 | **File Upload & Storage** | Upload data files (CSV, JSON, XML, PDF, etc.) to local storage. Files served via Next.js API routes or static serving. | CKAN FileStore |
| 6 | **Public Dataset Listing & Detail Pages** | Browsable public pages showing all published datasets with detail views for each. SSR/SSG for SEO. | CKAN/DKAN frontend |
| 7 | **Basic Search** | Full-text keyword search across dataset titles, descriptions, and keywords. Powered by database queries (SQLite FTS or PostgreSQL full-text). | CKAN search |
| 8 | **Publisher/Organization Support** | Datasets belong to a publishing organization. Basic org management (name, description, logo). | CKAN organizations |
| 9 | **Authentication & Authorization** | Admin login with role-based access. At minimum: admin (full access) and public (read-only). | CKAN auth |
| 10 | **REST API** | JSON API for dataset CRUD operations. Should follow patterns compatible with CKAN's action API where practical to ease migration. | CKAN API, DKAN API |

### Tier 2 — Core Experience (Fast Follow)

Features that make the platform genuinely useful and competitive, but aren't strictly required for a v1 launch.

| # | Feature | Description | Reference |
|---|---------|-------------|-----------|
| 11 | **Faceted Search & Filtering** | Filter datasets by organization, keyword/tag, format, category/theme, temporal range. | CKAN faceted search |
| 12 | **Dataset Categories/Themes** | Taxonomy system for categorizing datasets (e.g., Health, Education, Transportation). Maps to DCAT-US `theme` field. | CKAN groups, DKAN themes |
| 13 | **Data Preview** | In-browser preview of tabular data (CSV), with sortable/filterable table view. Consider JSON and PDF preview as well. | CKAN DataTables view |
| 14 | **Datastore (Queryable Tabular Data)** | Parse uploaded CSVs into database tables. Expose a SQL-like query API so third-party apps can filter/sort/paginate the actual data. | CKAN DataStore, DKAN Datastore |
| 15 | **Contact Point Management** | Structured contact information (name, email) per dataset, supporting the DCAT-US `contactPoint` vCard format. | DCAT-US spec |
| 16 | **License Management** | Predefined license options (Public Domain, CC-BY, CC0, etc.) with URLs. Maps to DCAT-US `license` field. | CKAN licenses |
| 17 | **Responsive Design & Theming** | Mobile-friendly, accessible (WCAG 2.1 AA), and customizable branding (logo, colors, hero). | CKAN theming |
| 18 | **Metadata Validation** | Real-time validation of dataset metadata against the DCAT-US JSON schema before save. Clear error messages for missing/invalid fields. | Data.gov validator |
| 19 | **SEO & Structured Data** | JSON-LD / Schema.org Dataset markup on public pages for Google Dataset Search discoverability. Open Graph tags. | Schema.org alignment |
| 20 | **Multi-role Authorization** | Roles beyond admin: editor (can create/edit own datasets), org admin (manages their org's datasets), viewer (authenticated read). | CKAN roles |

### Tier 3 — Differentiation (Growth Phase)

Features that set the platform apart from CKAN/DKAN and serve more advanced use cases.

| # | Feature | Description | Reference |
|---|---------|-------------|-----------|
| 21 | **Harvesting** | Import datasets from remote `data.json` endpoints. Schedule periodic re-harvests. Essential for aggregator portals like Data.gov. | CKAN federation, DKAN harvest |
| 22 | **Data Dictionary Support** | Column-level metadata for tabular datasets. Describe each field's name, type, description, and constraints. Frictionless Data table schema compatible. | DKAN data dictionaries |
| 23 | **Basic Data Visualization** | Built-in chart generation (bar, line, pie) from datastore data. Embeddable chart widgets. | CKAN charts, DKAN Dash |
| 24 | **Activity Stream / Audit Log** | Track who changed what and when. Public-facing recent activity feed. | CKAN activity streams |
| 25 | **API Documentation (Interactive)** | Auto-generated Swagger/OpenAPI docs for the REST API. Try-it-out functionality. | DKAN Swagger UI |
| 26 | **Bulk Import/Export** | Upload a spreadsheet or JSON file to create many datasets at once. Export full catalog as CSV or JSON. | CKAN CSV import |
| 27 | **Geospatial Support** | Map-based spatial search. Bounding box and named place support for the `spatial` field. Map preview for geo datasets. | CKAN geospatial |
| 28 | **Cloud Storage Integration** | Store uploaded files in S3, GCS, or Azure Blob instead of local filesystem. | CKAN cloud extensions |
| 29 | **Content Pages / CMS** | Simple pages for About, Terms of Use, FAQ, etc. Markdown or rich-text editor. | DKAN (via Drupal) |
| 30 | **Email Notifications** | Notify org admins when datasets are added/modified. Subscribe to dataset update alerts. | CKAN notifications |

### Tier 4 — Advanced / Enterprise (Long-term Roadmap)

| # | Feature | Description | Reference |
|---|---------|-------------|-----------|
| 31 | **DCAT-US v3.0 Support** | Dataset series, versioning, inverse properties, enhanced geospatial metadata. Forward-compatible with the emerging standard. | DCAT-US v3.0 draft |
| 32 | **Editorial Workflow** | Draft → Review → Publish pipeline with approval steps. Useful for larger organizations with multiple data publishers. | DKAN Workflow |
| 33 | **Dataset Versioning** | Track and access previous versions of datasets and their distributions. | DCAT-US v3.0 |
| 34 | **Federation (Outbound)** | Expose your catalog for harvesting by other portals (e.g., Data.gov). Beyond just `/data.json` — support CKAN-compatible harvest endpoints. | CKAN federation |
| 35 | **Analytics Dashboard** | Track dataset views, downloads, and API usage. Surface popular datasets. | CKAN analytics extensions |
| 36 | **Data Quality Scoring** | Automated completeness scoring based on metadata fill-rate. Flag datasets missing key fields. | DCAT-US `dataQuality` |
| 37 | **Comments & Community Features** | Allow public users to ask questions or leave feedback on datasets. | CKAN Discourse extension |
| 38 | **SSO / External Auth** | SAML, OAuth2, or Active Directory integration for enterprise single sign-on. | CKAN ADFS extension |
| 39 | **Multi-language Support** | Translatable UI and multilingual metadata fields. | CKAN fluent extension |
| 40 | **Plugin / Extension System** | Allow third-party extensions to add features without forking the core. | CKAN plugin architecture |

---

## Architecture Notes for Next.js Implementation

**Where our platform wins over CKAN/DKAN:**

- **Zero-config dev start:** `npx create-nextkan` → running in under 5 minutes with SQLite
- **Single runtime:** Node.js only — no Python, Solr, Redis, PHP, or Drupal
- **Modern React UI:** Server components, App Router, Tailwind — familiar to any React dev
- **AI-friendly codebase:** Prisma + Zod + TypeScript = excellent Claude Code / Copilot support
- **Progressive complexity:** Start with SQLite, scale to PostgreSQL. Start local file storage, scale to S3.
- **Built-in SSR/SSG:** SEO out of the box, Google Dataset Search ready

**Key technical decisions:**

| Concern | Approach |
|---------|----------|
| Database | SQLite (dev/small prod) → PostgreSQL (scale) via Prisma |
| Search | SQLite FTS5 / PostgreSQL full-text initially; optional Meilisearch later |
| File storage | Local filesystem → S3-compatible (via presigned URLs) |
| Auth | NextAuth.js with credentials provider; extensible to OAuth/SAML |
| Validation | Zod schemas mirroring DCAT-US JSON Schema |
| API | Next.js Route Handlers (REST); optional tRPC for type-safe internal calls |
| Datastore | Parse CSV → SQLite/PostgreSQL tables; expose query API |
