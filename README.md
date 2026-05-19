# NextKAN

A lightweight, open-source [DCAT-US](https://resources.data.gov/resources/dcat-us/)-compliant data catalog, built as a modern alternative to CKAN and DKAN. NextKAN is designed to be **the catalog agents want to talk to**: alongside the traditional REST API and `/data.json` endpoint, it ships a first-class [MCP](https://modelcontextprotocol.io) server exposing structured tools (`list_datasets`, `query_dataset`, `aggregate_dataset`, …) backed by Parquet + DuckDB.

A developer can spin up a fully compliant catalog in under 5 minutes against SQLite, with a clear upgrade path to PostgreSQL for production.

## Quickstart

```bash
git clone <this-repo> nextkan && cd nextkan
npm install
cp .env.example .env       # edit AUTH_SECRET; defaults work for local dev
npx prisma db push         # apply schema to SQLite at ./dev.db
npx prisma db seed         # create the seed admin user
npm run dev                # admin + public catalog on http://localhost:3000
npm run mcp:dev            # sibling MCP server on http://localhost:3001/mcp
```

Sign in at [http://localhost:3000/admin](http://localhost:3000/admin) with the credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

## Agent-facing contracts

NextKAN exposes two equal-priority contracts for non-human consumers:

- **`GET /data.json`** — DCAT-US v1.1 catalog feed for federal harvesters (data.gov). Dynamically generated from the database. See [`docs/dcat-us-reference-sample.json`](docs/dcat-us-reference-sample.json).
- **MCP server** — Streamable HTTP transport on `:3001/mcp`. Six core tools defined in [`docs/mcp-server-spec.md`](docs/mcp-server-spec.md). Queries run against Parquet via DuckDB, with per-IP rate limiting and LRU result caching.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Prisma 7 · SQLite (default) / PostgreSQL (prod) · Tailwind 4 · NextAuth.js v5 · Vitest + Playwright · `@modelcontextprotocol/sdk` · `@duckdb/node-api`.

## Project structure

- [`src/app/`](src/app) — Next.js App Router (admin + public catalog + REST + `/data.json`)
- [`mcp-server/`](mcp-server) — Sibling MCP server (independent process)
- [`src/lib/duckdb/`](src/lib/duckdb), [`src/lib/profiling/`](src/lib/profiling) — Parquet/DuckDB pipeline and column profiling
- [`src/lib/ai/`](src/lib/ai) — Anthropic adapter for AI metadata authoring (degrades gracefully without `ANTHROPIC_API_KEY`)
- [`prisma/`](prisma) — Schema + seed
- [`docs/`](docs) — Implementation plans and specs

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — primary entry point for contributors (and AI agents). Project conventions, pivot status, current focus.
- **[docs/pivot-context.md](docs/pivot-context.md)** — why NextKAN went agent-first in 2026-05 and what that means.
- **[docs/tier-1.5-agent-first.md](docs/tier-1.5-agent-first.md)** — current implementation focus.
- **[docs/mcp-server-spec.md](docs/mcp-server-spec.md)** — authoritative MCP tool spec.

## Status

Tier 1 + Tier 1.5 (agent-first pivot) complete. Tier 2–4 features (human-browsable catalog) are shipped but in maintenance mode while MCP and AI features mature. See [`docs/`](docs) for tier-by-tier status.
