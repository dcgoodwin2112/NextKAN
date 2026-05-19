# Pivot Context: Agent-First Direction

**Status:** Active — supersedes the human-first framing in earlier planning docs.
**Read first.** This document explains why NextKAN is changing direction and what that means for which existing planning still applies.

## Codebase reconciliation (added 2026-05-18)

This doc was drafted in Claude chat without read access to the repo. A subsequent audit found that **most of Tier 1–4 is already built** (139 unit tests, 10 E2E specs, 80%+ coverage on `src/lib/`). Some terminology in this doc maps onto existing models rather than new ones. See `~/.claude/plans/users-dgoodwin-downloads-cluade-nextkan-radiant-giraffe.md` for the full integration roadmap. Key mappings:

| Pivot term | Maps to existing |
| --- | --- |
| `Resource` model | `Distribution` (extended with `parquetPath`, `originalPath`, `rowCount`, `profileStatus`, etc.) |
| `Column` model | `DataDictionaryField` (extended with stats + agent-readiness fields) |
| `src/lib/datastore/` | Use `src/lib/duckdb/` instead — `src/lib/services/datastore.ts` already exists for the SQLite path |
| MCP datastore architecture | Adds Parquet+DuckDB **alongside** the existing SQLite datastore; doesn't replace it |

## What changed and why

NextKAN was originally scoped as a lightweight DCAT-US-compliant alternative to CKAN/DKAN, with a browseable public catalog as the primary user surface. While building toward that, the maintainer observed that production DKAN deployments are seeing rapidly growing traffic from AI agents — and that agent traffic is increasingly the dominant query load on datastore endpoints.

Two things follow from that observation:

1. The primary "user" of an open data catalog is shifting from humans browsing a UI to agents calling APIs and tools. The catalog UI is becoming the legacy interface, not the headline experience.

2. The CKAN/DKAN datastore architecture (row-oriented PostgreSQL/MySQL tables, one per resource) is fundamentally bad at the queries agents want to run — group-bys, aggregations, exploratory `SELECT DISTINCT` calls. This is causing real performance problems on production sites.

NextKAN's revised thesis: **be the catalog agents want to talk to.** Specifically:

- A first-class MCP server exposing structured tools to agents, designed so that schema discovery happens at advertisement time (cheap, cacheable) rather than query time (expensive).
- A datastore architecture (Parquet + embedded DuckDB) that solves the aggregation-overload problem the CKAN/DKAN pattern causes.
- AI-powered authoring features in the admin that reduce metadata friction — the same metadata that makes the MCP tool surface useful for agents.

The dual identity is intentional: NextKAN as a Next.js project, NextKAN as the next iteration of an open data catalog beyond CKAN/DKAN.

## What this changes

### Deprioritized (not deleted)

- **Tier 2–4 features focused on the human-browsable catalog.** Faceted search UI, social/sharing features, polished public dataset pages, dashboard widgets — these still exist as future work, but they're no longer the headline. Don't invest implementation effort in them ahead of the agent-first work.
- **Anything that assumed humans were the dominant query consumer.** Some features in the existing tier docs need re-evaluation under the new thesis.
- The public-facing catalog UI gets a working baseline (so agencies have a URL to point at) but doesn't get polish budget.

### Added

- **MCP server as a first-class deliverable**, equal in importance to the `/data.json` endpoint. Both are agent-consumed contracts.
- **A new Tier 1.5: Agent-First MVP** (see `docs/tier-1.5-agent-first.md`). This contains the foundational agent-first work: column metadata schema, profiling pipeline, Parquet datastore, MCP server scaffold, first AI features.
- **AI features in the admin** prioritized around reducing metadata friction. See `docs/nextkan-ai-features.md`.

### Unchanged

The existing technical foundations are kept and extended, not rewritten. Specifically:

- **Tier 1 (MVP)** as built: dataset CRUD, Prisma 7 conventions, NextAuth.js v5, DCAT-US transformer, dynamic `/data.json` endpoint, REST API, file upload, public pages baseline, search baseline. All of this is foundational and stays.
- **Stack**: Next.js 15 App Router, TypeScript strict, Prisma 7, Tailwind 4, Vitest, Playwright. No replacements.
- **Conventions**: Server Actions in `src/lib/actions/`, Zod schemas in `src/lib/schemas/`, colocated tests, slug generation, API error utilities. All apply to the new work.
- **DCAT-US v1.1 compliance.** The `/data.json` endpoint is more important under this pivot, not less — agents will consume it.

## Reading order

For Claude Code starting fresh on a Tier 1.5 task:

1. This document (`docs/pivot-context.md`) for context on why the codebase is changing direction.
2. `CLAUDE.md` for project conventions and current state.
3. `docs/tier-1-implementation.md` for the foundational work that Tier 1.5 builds on. Skim if Tier 1 is already complete — refer back only for the specific subsystems being extended.
4. `docs/tier-1.5-agent-first.md` for the concrete work to do.
5. `docs/mcp-server-spec.md` while implementing the MCP server.
6. `docs/nextkan-ai-features.md` for the longer AI feature roadmap (Tier 1.5 only implements the first 1–2 of these).

The original `docs/tier-2-implementation.md` through `docs/tier-4-implementation.md` should be treated as "needs revision under agent-first pivot" rather than authoritative. Don't implement features from them without checking against this pivot first.

## Architectural overview after the pivot

```
                        ┌─────────────────────┐
                        │  Next.js admin app  │
                        │  (src/, port 3000)  │
                        │                     │
                        │  - Dataset CRUD     │
                        │  - File upload      │
                        │  - AI features      │
                        │  - Agent preview    │
                        │  - REST API         │
                        │  - /data.json       │
                        │  - Public catalog   │
                        └─────────┬───────────┘
                                  │
                                  │ shares
                                  ▼
                        ┌─────────────────────┐
                        │  Prisma schema      │
                        │  SQLite (dev) or    │
                        │  PostgreSQL (prod)  │
                        │                     │
                        │  Catalog metadata:  │
                        │  Dataset, Resource, │
                        │  Column, User, ...  │
                        └─────────┬───────────┘
                                  │
                                  │ referenced by
                                  ▼
                        ┌─────────────────────┐
                        │  MCP server         │
                        │  (mcp-server/,      │
                        │   port 3001)        │
                        │                     │
                        │  - Streamable HTTP  │
                        │  - Stateless        │
                        │  - Anonymous read   │
                        │  - Rate-limited     │
                        │  - Result-cached    │
                        └─────────┬───────────┘
                                  │
                                  │ queries
                                  ▼
                        ┌─────────────────────┐
                        │  Storage layer      │
                        │  (storage/)         │
                        │                     │
                        │  storage/resources/ │
                        │    <id>/            │
                        │      original.csv   │
                        │      data.parquet   │
                        │                     │
                        │  Queried by DuckDB  │
                        │  (@duckdb/node-api) │
                        └─────────────────────┘
```

Two processes, one repo, one Prisma client, shared `src/lib/` modules. Independently deployable via Docker.

## Key architectural decisions (locked, not to be revisited without good reason)

These were worked through deliberately. Don't reopen them unless implementation reveals a concrete problem.

1. **MCP transport: Streamable HTTP, stateless, sibling process.** Not stdio (catalog is a hosted server, not a subprocess), not embedded in Next.js (independent scaling and deployability matter).
2. **MCP auth: Anonymous read by default.** Open data is public by definition. Rate limiting and tool surface design are the defensive layer, not authentication. No MCP write tools in v1. Optional bearer tokens documented as Phase 2.
3. **Datastore: Parquet files queried via embedded DuckDB.** Not per-resource PostgreSQL tables (the pattern that's overloading DKAN). Catalog metadata stays in Prisma; tabular resource rows go to Parquet. Use `@duckdb/node-api` (NOT the deprecated `duckdb` package).
4. **Column metadata: Relational `Column` model with FK to `Resource`.** Not a JSON blob on Resource. ~20 fields covering identity, type, stats, semantics, agent-readiness, spatial. Plus an `extensions` JSON escape hatch for future fields.
5. **Profiling: Synchronous in Server Action, worker thread, 100MB limit.** No job queue for v1. Streaming status updates to the admin during the request. Async architecture documented as future work.
6. **AI provider: Anthropic via `@anthropic-ai/sdk`.** Default model `claude-sonnet-4-6`, configurable. `ANTHROPIC_API_KEY` env var. AI features gracefully degrade when the key is absent.
7. **Repo layout: Single repo, single `package.json`, no workspaces.** MCP server as sibling directory (`mcp-server/`). Shared `src/lib/` modules. Both deployable independently via Docker.

The full reasoning behind each decision lives in the chat that produced these docs. Each decision was pressure-tested against the alternatives.

## What success looks like for Tier 1.5

When Tier 1.5 is complete, an agency operator can:

1. Spin up NextKAN locally in under 5 minutes (still true).
2. Upload a CSV via the admin UI and see the system produce a fully populated DCAT-US draft they then review and edit, with per-column annotations including types, statistics, and AI-generated descriptions.
3. Publish the dataset, at which point it's automatically queryable via MCP tools (list, get, query, aggregate, sample, schema) and via the existing REST API.
4. Connect Claude Desktop (or any MCP client) to the MCP server URL and immediately get a working contract — the MCP client can discover datasets, understand their schemas, and run efficient queries against the underlying Parquet files.
5. See, in the admin UI, a live preview of how their dataset will appear to an agent, including the generated MCP tool calls and example responses.

That's the bar. Everything else is future work.
