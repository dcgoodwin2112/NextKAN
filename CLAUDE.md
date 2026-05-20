# CLAUDE.md

## Project Overview

This is **NextKAN** — a lightweight, open-source Next.js data catalog platform, built as a modern alternative to CKAN and DKAN. As of the 2026-05 agent-first pivot, the project's headline thesis is "**be the catalog agents want to talk to**": a first-class MCP server exposing structured tools alongside the traditional REST API and DCAT-US `/data.json` endpoint.

**Core promise:** A developer can spin up a fully compliant data catalog in under 5 minutes using SQLite, with a clear upgrade path to PostgreSQL for production. The catalog is queryable by AI agents through a dedicated MCP server out of the box.

**Dual identity:** NextKAN as a Next.js project, NextKAN as the next iteration of an open data catalog beyond CKAN/DKAN.

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

All planning docs are in the `docs/` directory. **Read the relevant doc before starting work on that area.**

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `docs/pivot-context.md` | The 2026-05 agent-first pivot: why, what changed, what's locked | **Read first** before any Tier 1.5+ work |
| `docs/tier-1.5-agent-first.md` | Agent-first MVP: column metadata, profiling, AI features, MCP server | **Status: COMPLETE.** Reference for the agent-first contract; see `docs/backlog.md` for outstanding verification. |
| `docs/mcp-server-spec.md` | Authoritative MCP server spec: tools, schemas, behavior, errors | While implementing or modifying the MCP server |
| `docs/features.md` | Research summary + 40-feature prioritized roadmap | Background context only |
| `docs/tier-1-implementation.md` | MVP implementation plan (10 features) | **Status: COMPLETE.** Reference for foundations Tier 1.5 builds on. |
| `docs/tier-2-implementation.md` | Core experience (10 features) | **Largely complete; treat as historical.** Needs revision under agent-first pivot — do NOT implement from this without checking `docs/pivot-context.md`. |
| `docs/tier-3-implementation.md` | Differentiation (10 features) | **Largely complete; treat as historical.** Same caveat as Tier 2. |
| `docs/tier-4-implementation.md` | Enterprise (10 features) | **Largely complete; treat as historical.** Same caveat as Tier 2. |
| `docs/testing-setup.md` | Vitest/Playwright config, mock patterns, test infrastructure | Read during Tier 1 setup — config persists after |
| `docs/testing-addenda.md` | Required tests per feature per tier | Reference while implementing each feature |
| `docs/dcat-us-reference-sample.json` | Real-world valid DCAT-US data.json example | Reference when implementing /data.json endpoint and transformer |

## Pivot status (2026-05)

The agent-first pivot landed on 2026-05-19. All eleven Tier 1.5 features are implemented, tested, and merged. Outstanding follow-up verification (MCP Inspector live test, profiling boundary, E2E re-baseline) is tracked in `docs/backlog.md`. The phased integration plan lives at `~/.claude/plans/users-dgoodwin-downloads-cluade-nextkan-radiant-giraffe.md`. Three locked decisions from that plan:

1. **Extend `Distribution` + `DataDictionaryField`** — do not create new `Resource` / `Column` models. The pivot docs' "Resource" is a semantic alias for the existing `Distribution`; "Column" maps onto `DataDictionaryField`.
2. **Add Parquet+DuckDB alongside the existing SQLite datastore** — do not replace it. The existing `/api/datastore/sql` keeps working against SQLite. The MCP server queries Parquet via DuckDB. Consolidation is later work.
3. **DuckDB helpers live under `src/lib/duckdb/`**, NOT `src/lib/datastore/` (which would collide with the existing SQLite-backed `src/lib/services/datastore.ts`).

## Deprioritized features (no further polish budget)

These are built and working, but the agent-first pivot says don't invest implementation effort here:

- Charts (`src/app/admin/charts/`, embed routes)
- Comments / community features
- CMS pages (`src/app/admin/pages/`, public pages route)
- Analytics dashboard (`src/app/admin/analytics/`)
- Link checker (`src/app/admin/link-check/`)
- Themes admin UI (`src/app/admin/themes/`)
- `/api-docs` reference page (the OpenAPI JSON itself is still useful)
- Faceted search UI polish (the facet computation backend stays)

Keep these stable, fix outright bugs if reported, but don't extend them. Retirement of any individual feature happens only after the MCP server is proven and an actual conflict is identified.

## Critical Compliance Requirements

NextKAN has two equal-priority agent-facing contracts:

### 1. The `/data.json` endpoint

The federal harvester contract. It must:
- Be dynamically generated from the database (never static/cached)
- Conform exactly to DCAT-US v1.1 schema structure
- Match the format shown in `docs/dcat-us-reference-sample.json`
- Set `Access-Control-Allow-Origin: *` and `Cache-Control: no-store`
- Only include published datasets

Data.gov harvesters consume this endpoint. If it's wrong, the catalog is useless for federal compliance.

### 2. The MCP server (post-pivot)

Equal in importance to `/data.json`. The MCP server (sibling process at `mcp-server/`, port 3001) is the primary contract for AI agents querying the catalog. It must:

- Conform to the MCP spec (2025-11-25 or later) — Streamable HTTP transport, stateless mode
- Expose the six core tools defined in `docs/mcp-server-spec.md`: `list_datasets`, `get_dataset`, `get_schema`, `query_dataset`, `aggregate_dataset`, `sample_dataset`
- Enforce `filterable` / `aggregatable` flags on `DataDictionaryField` strictly
- Apply per-IP rate limiting and LRU result caching
- Run as an independent process (sibling to the Next.js admin)

## Development Workflow

1. Read the implementation plan for the current tier
2. Read `docs/testing-setup.md` (Tier 1 only — config persists after)
3. Implement features in order — each feature includes exact file paths, schemas, and code patterns
4. Write tests for each feature as specified in `docs/testing-addenda.md`
5. Run `npm run test:run` after each feature — all tests must pass before moving on
6. Run `npm run typecheck` to verify TypeScript types — must stay at 0 errors; no PR may regress this
7. Run `npm run test:e2e` after completing all features in a tier
8. Verify the completion checklist at the bottom of each tier document
9. Update docs to reflect completed work — tier implementation docs (checklists, test counts, status headers), `docs/backlog.md`, and `MEMORY.md`

## Key Conventions

### General

- **Test files** colocated with source: `dataset.ts` → `dataset.test.ts`
- **E2E tests** in top-level `e2e/` directory
- **Server actions** in `src/lib/actions/` (not inline in components)
- **Zod schemas** in `src/lib/schemas/`
- **Prisma mock** at `src/__mocks__/prisma.ts` using vitest-mock-extended
- **Slugs** generated from titles via the `slugify` package
- **API errors** handled via shared utility at `src/lib/utils/api.ts`

### Tier 1.5+ additions

- **AI calls** never made directly from Server Actions or routes. Always go through `src/lib/ai/` adapter functions.
- **AI features** must gracefully degrade when `ANTHROPIC_API_KEY` is absent. The catalog works end-to-end without an API key; AI features just disable themselves.
- **DuckDB queries** never run on the main Node.js event loop in the admin. Profiling uses `worker_threads`. The MCP server is a separate process, so it can use DuckDB directly.
- **Profiling worker_threads require the Next.js build pipeline.** The worker entry resolves the `@/*` tsconfig alias only when compiled by Next.js. Standalone `npx tsx` invocations must call `profileResource()` in-process and inject it via `profileDistribution(id, { profiler })` (see `test-data/seed-pivot-fixture.ts`).
- **MCP tools** never accept raw SQL from agents. All queries are constructed server-side from structured tool inputs.
- **Storage paths** for the new Parquet/profile pipeline are relative to `NEXTKAN_STORAGE_PATH`, never absolute. New uploads go under `storage/resources/<distributionId>/`. Existing uploads under `public/uploads/` keep working via `Distribution.filePath`.
- **DuckDB helpers** live under `src/lib/duckdb/` (NOT `src/lib/datastore/`, which would collide with `src/lib/services/datastore.ts`).
- **MCP server** code lives in `mcp-server/` (sibling directory at repo root); it imports Prisma from `@/generated/prisma/client` and shares the same database as the admin.

### Server action return shapes

Server actions in `src/lib/actions/` currently return a mix of raw Prisma rows, hand-picked subsets, and `{ success, data }` envelopes — this is historical drift, not a deliberate choice. **For new actions:** return a shaped object (`{ id, … }`) with only the fields the caller needs; don't return raw Prisma payloads. Existing actions are not being retrofitted in bulk — change one only when you're already editing it for another reason.

### Logging

Server-side errors that aren't user-actionable should go through pino:

- **MCP server** — `mcp-server/logger.ts`. `withToolErrorHandling` in `mcp-server/tools/helpers.ts` already logs every caught tool error with `tool` + `args` context; new tools wire through the same helper.
- **Admin** — use `silentCatch()` from `src/lib/utils/log.ts` for fire-and-forget side effects (activity logs, emails). Direct `console.error` is acceptable only inside `silentCatch`.

Tests silence pino via `LOG_LEVEL=silent` set in `vitest.setup.ts`. Set `LOG_LEVEL=debug` to see structured logs during local debugging or `npm run mcp:dev`.

### Date formatting (known debt)

Date rendering is currently scattered across components — `toLocaleDateString()`, `toISOString().split("T")[0]`, ad-hoc "X ago" math. There is no shared formatter. **Don't centralize in passing**; when a feature touches enough date-rendering surface to warrant it, do that work as its own task. New code should prefer `toLocaleDateString()` for human-facing dates and ISO strings for machine-facing ones.

## Git

- Always use `--no-gpg-sign` on commits (GPG signing hangs in non-interactive contexts)

## Common Commands

```bash
npm run dev          # Start Next.js admin dev server (port 3000)
npm run mcp:dev      # Start MCP server in watch mode (port 3001) — added in Phase 1 of the pivot rollout
npm run test         # Run Vitest in watch mode
npm run test:run     # Run all unit/component tests once
npm run test:e2e     # Run Playwright E2E tests
npm run test:coverage # Coverage report
npx prisma db push   # Apply schema changes
npx prisma db seed   # Seed admin user
npx prisma studio    # Visual database browser
```
