# Backlog

Features and tasks deferred for future implementation.

---

## Feature 38: SSO / External Auth

**Deferred from:** Tier 4
**Reason:** Requires external OAuth provider setup (GitHub, Azure AD, SAML) and significant auth infrastructure changes.

### Scope

- **OAuth2 Provider Support:** Add GitHub, Google, Azure AD providers to NextAuth.js config, gated by env vars (`GITHUB_CLIENT_ID`, `AZURE_AD_CLIENT_ID`, etc.)
- **SAML Support:** Optional integration via `@boxyhq/saml-jackson` for government SSO
- **User Provisioning:** Auto-create User record on first SSO login with configurable default role (`SSO_DEFAULT_ROLE`)

### Key Files

- `src/lib/auth.ts` — add OAuth/SAML providers alongside existing credentials provider
- New env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `SSO_DEFAULT_ROLE`

---

## Feature 39: Multi-language Support (i18n)

**Deferred from:** Tier 4
**Reason:** Requires `next-intl` integration, message extraction across all UI components, and multilingual metadata schema changes.

### Scope

- **UI Internationalization:** Install `next-intl`, create `messages/en.json` + additional locale files, wrap root layout with `NextIntlClientProvider`
- **Multilingual Metadata:** New `DatasetTranslation` model (datasetId + locale + title + description + keywords), unique on `[datasetId, locale]`
- **Language-aware API:** `/data.json` and `/api/datasets` accept `?lang=` parameter, merge translated fields over defaults

### Key Files

- `src/i18n.ts` — next-intl config
- `messages/*.json` — locale message files
- `prisma/schema.prisma` — DatasetTranslation model
- `src/lib/schemas/dcat-us.ts` — language-aware transformer

---

## Full WCAG 2.1 AA Audit

**Deferred from:** Tier 2

### Done in Tier 2

- Semantic HTML (`<main>`, `<nav>`, `<section>`)
- Focus indicators on interactive elements
- Keyboard-accessible navigation (hamburger menu)
- Form inputs with associated labels
- Responsive layout at all breakpoints

### Remaining

- Thorough color contrast audit (4.5:1 for normal text, 3:1 for large text)
- Screen reader testing (NVDA/VoiceOver)
- ARIA attributes where semantic HTML is insufficient
- Skip navigation links
- Error announcement for form validation
- Focus management on route changes

---

## Feature 14: Datastore (Queryable Tabular Data)

**Status: COMPLETE** — Implemented as standalone effort. See `src/lib/services/datastore.ts` and `src/app/api/datastore/`.

**Deferred from:** Tier 2
**Reason:** Complex enough for a standalone implementation cycle — dynamic table creation, CSV import with type inference, query API with SQL injection surface.

---

## Sample Seed Data

**Reason:** Current seed script (`prisma/seed.ts`) only creates 1 admin user + 16 themes. A richer seed makes the catalog useful out of the box for demos and development.

### Scope

Expand `prisma/seed.ts` to create:

- **Organizations:** 3–5 orgs (mix of parent + sub-organizations)
- **Users:** Multiple roles — admin, orgAdmin, editor, viewer (at least one per role)
- **Datasets:** 10–15 across themes with complete DCAT-US metadata (license, temporal, spatial, contactPoint, accrualPeriodicity, bureauCode, programCode)
- **Distributions:** Mix of external URLs and placeholder files with various formats (CSV, JSON, PDF, XML)
- **Keywords:** 5–10 per dataset
- **Theme assignments:** Each dataset tagged with 1–3 themes
- **Workflow states:** A few datasets in different states (draft, pending_review, published)

### Key Files

- `prisma/seed.ts` — main seed script

---

## Developer Documentation

**Reason:** No contributor-facing docs exist beyond `CLAUDE.md`. Developers need guidance on architecture, extending the platform, and contributing.

### Scope

- **Architecture overview:** App Router structure, data flow (server actions → Prisma → DB), auth model
- **Development setup:** Prerequisites, environment variables, database options (SQLite vs PostgreSQL)
- **Extension guide:** Adding new API endpoints, creating server actions, adding admin pages, writing Zod schemas
- **Plugin development:** Hook API reference, example plugin walkthrough
- **Testing guide:** How to write unit tests (Vitest mocks, Prisma mock pattern), integration tests (real DB), E2E tests (Playwright page objects)
- **Deployment:** Production configuration, PostgreSQL migration, environment variable reference

---

## `create-nextkan` CLI

**Reason:** No scaffolding tool exists. Developers must clone the repo manually. A generate command streamlines project creation.

### Scope

- **CLI package:** `create-nextkan` npm package (à la `create-next-app`)
- **Interactive prompts:** Project name, database choice (SQLite/PostgreSQL), optional features (workflow, comments, analytics)
- **Scaffolding:** Clone/copy template, write `.env` with selected options, install dependencies, run `prisma db push` + `prisma db seed`
- **Publish:** npm package with `bin` entry point, invokable via `npx create-nextkan`
