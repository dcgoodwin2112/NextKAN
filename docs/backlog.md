# Backlog

Pending features and tasks for future implementation. See `docs/backlog-completed.md` for completed items.

---

## Known Debt

Documented but not committed to a schedule. Apply going forward; do not retrofit in-place.

- **Date formatting** — `toLocaleDateString()`, manual ISO slicing, ad-hoc "X ago" math are scattered across `src/components/**`. There is no shared formatter. New code prefers `toLocaleDateString()` for human-facing dates and ISO strings for machine-facing ones. See [CLAUDE.md](../CLAUDE.md#date-formatting-known-debt).
- **Server action return shapes** — `src/lib/actions/**` mixes raw Prisma rows, hand-picked subsets, and `{success, data}` envelopes. New actions return a shaped object (`{ id, … }`) with only the fields the caller needs. See [CLAUDE.md](../CLAUDE.md#server-action-return-shapes).

---

## Public UI/UX

### Full WCAG 2.1 AA Audit

**Priority:** Medium
**Deferred from:** Tier 2

#### Done in Tier 2

- Semantic HTML (`<main>`, `<nav>`, `<section>`)
- Focus indicators on interactive elements
- Keyboard-accessible navigation (hamburger menu)
- Form inputs with associated labels
- Responsive layout at all breakpoints

#### Done in Phase 4

- `aria-label` on filter badge remove buttons (ActiveFilters + FacetSidebar)
- Badge `onClick` → `<button>` elements for keyboard accessibility
- `aria-controls` + `id` on expandable ResourceCard content
- Visually-hidden `(opens in new tab)` on external links in DatasetMetadata
- Descriptive logo `alt` text in PublicHeader

#### Remaining

- Thorough color contrast audit (4.5:1 for normal text, 3:1 for large text)
- Screen reader testing (NVDA/VoiceOver)
- Error announcement for form validation
- Focus management on route changes

---

## Enterprise Features

### Feature 38: SSO / External Auth

**Priority:** Low
**Deferred from:** Tier 4
**Reason:** Requires external OAuth provider setup (GitHub, Azure AD, SAML) and significant auth infrastructure changes.

#### Scope

- **OAuth2 Provider Support:** Add GitHub, Google, Azure AD providers to NextAuth.js config, gated by env vars (`GITHUB_CLIENT_ID`, `AZURE_AD_CLIENT_ID`, etc.)
- **SAML Support:** Optional integration via `@boxyhq/saml-jackson` for government SSO
- **User Provisioning:** Auto-create User record on first SSO login with configurable default role (`SSO_DEFAULT_ROLE`)

#### Key Files

- `src/lib/auth.ts` — add OAuth/SAML providers alongside existing credentials provider
- New env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`, `SSO_DEFAULT_ROLE`

---

### Feature 39: Multi-language Support (i18n)

**Priority:** Low
**Deferred from:** Tier 4
**Reason:** Requires `next-intl` integration, message extraction across all UI components, and multilingual metadata schema changes.

#### Scope

- **UI Internationalization:** Install `next-intl`, create `messages/en.json` + additional locale files, wrap root layout with `NextIntlClientProvider`
- **Multilingual Metadata:** New `DatasetTranslation` model (datasetId + locale + title + description + keywords), unique on `[datasetId, locale]`
- **Language-aware API:** `/data.json` and `/api/datasets` accept `?lang=` parameter, merge translated fields over defaults

#### Key Files

- `src/i18n.ts` — next-intl config
- `messages/*.json` — locale message files
- `prisma/schema.prisma` — DatasetTranslation model
- `src/lib/schemas/dcat-us.ts` — language-aware transformer

---

## Developer Experience

### Extension & Plugin Developer Guide

**Priority:** Medium
**Reason:** Architecture overview, dev setup, and testing patterns are now covered by `README.md`, `CLAUDE.md`, and `docs/testing-setup.md`. What's still missing is contributor-facing guidance on extending the platform.

#### Scope

- **Extension guide:** Adding new API endpoints, creating server actions, adding admin pages, writing Zod schemas
- **Plugin development:** Hook API reference (`src/lib/plugins/`), example plugin walkthrough
- **MCP tool authoring:** How to add a seventh MCP tool to `mcp-server/tools/` — schema, helpers, registration, tests
- **Deployment:** Production configuration, PostgreSQL migration, Docker Compose admin + MCP topology

---

### `create-nextkan` CLI

**Priority:** Low
**Reason:** No scaffolding tool exists. Developers must clone the repo manually. A generate command streamlines project creation.

#### Scope

- **CLI package:** `create-nextkan` npm package (à la `create-next-app`)
- **Interactive prompts:** Project name, database choice (SQLite/PostgreSQL), optional features (workflow, comments, analytics)
- **Scaffolding:** Clone/copy template, write `.env` with selected options, install dependencies, run `prisma db push` + `prisma db seed`
- **Publish:** npm package with `bin` entry point, invokable via `npx create-nextkan`
