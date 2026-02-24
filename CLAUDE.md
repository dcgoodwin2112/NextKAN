# CLAUDE.md

## Project Overview

This is **NextKAN** — a lightweight, open-source Next.js data catalog platform, built as a modern alternative to CKAN and DKAN. It enables government agencies and organizations to publish DCAT-US v1.1 compliant open data catalogs with zero external service dependencies.

**Core promise:** A developer can spin up a fully compliant data catalog in under 5 minutes using SQLite, with a clear upgrade path to PostgreSQL for production.

## Tech Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Prisma 7 ORM + SQLite (default) / PostgreSQL (production)
- Zod validation, Tailwind CSS 4, NextAuth.js v5
- Vitest + React Testing Library (unit/component tests)
- Playwright (E2E tests)

## Prisma 7 Conventions

Prisma 7 has breaking changes from earlier versions:

- **Generator:** `prisma-client` (not `prisma-client-js`), output to `src/generated/prisma/`
- **Schema:** `datasource` block has no `url` — datasource URL is in `prisma.config.ts`
- **Config:** `prisma.config.ts` holds datasource URL and seed command (not `package.json`)
- **PrismaClient:** Requires a driver adapter (`@prisma/adapter-better-sqlite3` for SQLite)
- **Imports:** All Prisma types import from `@/generated/prisma/client` (not `@prisma/client`)
- **Gitignore:** `/src/generated/prisma` is generated code, not committed

## Planning Documents

All planning docs are in the `docs/` directory. **Read the relevant doc before starting work on that tier.**

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `docs/features.md` | Research summary + 40-feature prioritized roadmap | Background context only |
| `docs/tier-1-implementation.md` | MVP implementation plan (10 features) | **Start here.** Complete Prisma schema, Zod schemas, DCAT-US transformer, CRUD, auth, API, public pages |
| `docs/tier-2-implementation.md` | Core experience (10 features) | After Tier 1 passes all tests |
| `docs/tier-3-implementation.md` | Differentiation (10 features) | After Tier 2 passes all tests |
| `docs/tier-4-implementation.md` | Enterprise (10 features) | After Tier 3 passes all tests |
| `docs/testing-setup.md` | Vitest/Playwright config, mock patterns, test infrastructure | **Read during Tier 1 setup, before writing any feature code** |
| `docs/testing-addenda.md` | Required tests per feature per tier | Reference while implementing each feature |
| `docs/dcat-us-reference-sample.json` | Real-world valid DCAT-US data.json example | Reference when implementing /data.json endpoint and transformer |

## Critical Compliance Requirement

The `/data.json` endpoint is the **single most important feature**. It must:
- Be dynamically generated from the database (never static/cached)
- Conform exactly to DCAT-US v1.1 schema structure
- Match the format shown in `docs/dcat-us-reference-sample.json`
- Set `Access-Control-Allow-Origin: *` and `Cache-Control: no-store`
- Only include published datasets

Data.gov harvesters consume this endpoint. If it's wrong, the catalog is useless.

## Development Workflow

1. Read the implementation plan for the current tier
2. Read `docs/testing-setup.md` (Tier 1 only — config persists after)
3. Implement features in order — each feature includes exact file paths, schemas, and code patterns
4. Write tests for each feature as specified in `docs/testing-addenda.md`
5. Run `npm run test:run` after each feature — all tests must pass before moving on
6. Run `npm run test:e2e` after completing all features in a tier
7. Verify the completion checklist at the bottom of each tier document
8. Update docs to reflect completed work — tier implementation docs (checklists, test counts, status headers), `docs/deferred-tasks.md`, and `MEMORY.md`

## Key Conventions

- **Test files** colocated with source: `dataset.ts` → `dataset.test.ts`
- **E2E tests** in top-level `e2e/` directory
- **Server actions** in `src/lib/actions/` (not inline in components)
- **Zod schemas** in `src/lib/schemas/`
- **Prisma mock** at `src/__mocks__/prisma.ts` using vitest-mock-extended
- **Slugs** generated from titles via the `slugify` package
- **API errors** handled via shared utility at `src/lib/utils/api.ts`

## Common Commands

```bash
npm run dev          # Start dev server
npm run test         # Run Vitest in watch mode
npm run test:run     # Run all unit/component tests once
npm run test:e2e     # Run Playwright E2E tests
npm run test:coverage # Coverage report
npx prisma db push   # Apply schema changes
npx prisma db seed   # Seed admin user
npx prisma studio    # Visual database browser
```
