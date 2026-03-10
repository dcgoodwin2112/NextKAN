# Backlog

Pending features and tasks for future implementation. See `docs/backlog-completed.md` for completed items.

---

## Public UI/UX

### Public Page UX Polish

**Priority:** High
**Reason:** No existing backlog item covers public-facing UX. Detail pages lack breadcrumbs, pages flash from empty to loaded with no skeleton loaders, the footer is minimal with no links, the header doesn't render `siteConfig.logo`, there's no custom 404 page, and long dataset detail pages have no back-to-top affordance.

#### Scope

- **Breadcrumbs component:** Reusable `<Breadcrumbs>` for dataset, organization, series, and theme detail pages (e.g., Home > Datasets > Dataset Title)
- **Skeleton loaders:** Loading skeletons for dataset list and detail pages (Next.js `loading.tsx` files with shimmer placeholders)
- **Footer enhancement:** Configurable footer with links (about, privacy, contact) — either from SiteConfig fields or content pages with `navLocation: "footer"`
- **Header logo:** Render `siteConfig.logo` as an `<img>` next to the site title in the public header
- **Custom 404 page:** Branded `not-found.tsx` matching the site theme, with search bar and link to homepage
- **Back-to-top button:** Floating button on dataset detail pages that appears after scrolling past a threshold

#### Key Files

- `src/components/public/Breadcrumbs.tsx` — new reusable component
- `src/app/datasets/loading.tsx`, `src/app/datasets/[slug]/loading.tsx` — skeleton loaders
- `src/components/layout/Footer.tsx` — enhanced footer
- `src/components/layout/Header.tsx` — logo rendering
- `src/app/not-found.tsx` — custom 404 page
- `src/components/public/BackToTop.tsx` — scroll-to-top button

---

### Related Datasets & Discovery

**Priority:** Medium
**Reason:** No cross-linking between datasets exists. Users see one dataset at a time with no suggestions for related content. The homepage shows recent datasets but no featured or trending sections.

#### Scope

- **Related datasets component:** Query datasets sharing themes or keywords with the current dataset, exclude the current one, limit to 3–4. Display on public dataset detail page.
- **Featured datasets:** Add `isFeatured` boolean to Dataset model. Admin toggle on dataset edit page. Featured section on homepage above recent datasets.
- **Popular datasets:** Query AnalyticsEvent for most-downloaded datasets. Display on homepage below featured section.

#### Key Files

- `src/components/datasets/RelatedDatasets.tsx` — new component
- `src/lib/services/discovery.ts` — queries for related, featured, and popular datasets
- `src/app/page.tsx` — homepage sections for featured and popular
- `src/app/datasets/[slug]/page.tsx` — add RelatedDatasets to detail page
- `prisma/schema.prisma` — add `isFeatured` field to Dataset

---

### Public Organization & Theme Pages Enhancement

**Priority:** Low
**Reason:** Organization and theme list pages are bare compared to the dataset list — no search, filtering, sorting, or hierarchy visualization.

#### Scope

- **Organization search:** Add search input to `/organizations` page, filter by name
- **Org hierarchy:** Display sub-organizations indented or nested under parent orgs
- **Theme detail page:** `/themes/[slug]` with theme description, dataset count, and paginated dataset list
- **Sorting:** Alphabetical and by dataset count on both org and theme list pages

#### Key Files

- `src/app/organizations/page.tsx` — add search + sorting + hierarchy display
- `src/app/themes/[slug]/page.tsx` — new theme detail page
- `src/app/themes/page.tsx` — add sorting options

---

### Full WCAG 2.1 AA Audit

**Priority:** Medium
**Deferred from:** Tier 2

#### Done in Tier 2

- Semantic HTML (`<main>`, `<nav>`, `<section>`)
- Focus indicators on interactive elements
- Keyboard-accessible navigation (hamburger menu)
- Form inputs with associated labels
- Responsive layout at all breakpoints

#### Remaining

- Thorough color contrast audit (4.5:1 for normal text, 3:1 for large text)
- Screen reader testing (NVDA/VoiceOver)
- ARIA attributes where semantic HTML is insufficient
- Skip navigation links
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

### Developer Documentation

**Priority:** High
**Reason:** No contributor-facing docs exist beyond `CLAUDE.md`. Developers need guidance on architecture, extending the platform, and contributing.

#### Scope

- **Architecture overview:** App Router structure, data flow (server actions → Prisma → DB), auth model
- **Development setup:** Prerequisites, environment variables, database options (SQLite vs PostgreSQL)
- **Extension guide:** Adding new API endpoints, creating server actions, adding admin pages, writing Zod schemas
- **Plugin development:** Hook API reference, example plugin walkthrough
- **Testing guide:** How to write unit tests (Vitest mocks, Prisma mock pattern), integration tests (real DB), E2E tests (Playwright page objects)
- **Deployment:** Production configuration, PostgreSQL migration, environment variable reference

---

### `create-nextkan` CLI

**Priority:** Low
**Reason:** No scaffolding tool exists. Developers must clone the repo manually. A generate command streamlines project creation.

#### Scope

- **CLI package:** `create-nextkan` npm package (à la `create-next-app`)
- **Interactive prompts:** Project name, database choice (SQLite/PostgreSQL), optional features (workflow, comments, analytics)
- **Scaffolding:** Clone/copy template, write `.env` with selected options, install dependencies, run `prisma db push` + `prisma db seed`
- **Publish:** npm package with `bin` entry point, invokable via `npx create-nextkan`
