# Deferred Tasks

Tasks deferred from Tier 2 for separate implementation.

---

## Feature 14: Datastore (Queryable Tabular Data)

**Status: COMPLETE** — Implemented as standalone effort. 226 tests passing (68 new datastore tests). See `src/lib/services/datastore.ts` and `src/app/api/datastore/`.

**Deferred from:** Tier 2
**Reason:** Complex enough for a standalone implementation cycle — dynamic table creation, CSV import with type inference, query API with SQL injection surface.

### Scope

- **DatastoreTable schema model** — tracks imported tables (tableName, columns JSON, rowCount, status)
- **CSV import service** — PapaParse streaming, type inference from first 100 rows, batch inserts via `prisma.$executeRawUnsafe()`
- **Auto-import on upload** — trigger import when CSV distribution is created
- **Structured query API** (`GET /api/datastore/[distributionId]`) — parameterized queries with column validation, filtering, sorting, pagination
- **SQL query endpoint** (`POST /api/datastore/sql`) — SELECT-only, restricted to `ds_*` tables

### Schema Addition

```prisma
model DatastoreTable {
  id             String   @id @default(uuid())
  distributionId String   @unique
  distribution   Distribution @relation(fields: [distributionId], references: [id], onDelete: Cascade)
  tableName      String   @unique
  columns        String   // JSON: [{ name: string, type: "TEXT" | "INTEGER" | "REAL" | "BOOLEAN" }]
  rowCount       Int      @default(0)
  status         String   @default("pending") // "pending" | "importing" | "ready" | "error"
  errorMessage   String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Also add `datastoreTable DatastoreTable?` relation on Distribution model.

### Testing Requirements

- Unit tests for CSV import (mocked Prisma + fs)
- Integration tests: import a real CSV into test database and query it
- Query API tests: filtering, sorting, pagination, SQL injection prevention
- SQL endpoint tests: SELECT-only validation, `ds_*` table restriction

### Security Considerations

- Column names must be validated against known columns list (never interpolated directly into SQL)
- SQL endpoint must parse/validate queries — only allow SELECT, only `ds_*` tables
- Row limits enforced (max 10,000 per query)

---

## Full WCAG 2.1 AA Audit

**Deferred from:** Tier 2
**Planned for:** Tier 4

### Done in Tier 2

- Semantic HTML (`<main>`, `<nav>`, `<section>`)
- Focus indicators on interactive elements
- Keyboard-accessible navigation (hamburger menu)
- Form inputs with associated labels
- Responsive layout at all breakpoints

### Remaining for Tier 4

- Thorough color contrast audit (4.5:1 for normal text, 3:1 for large text)
- Screen reader testing (NVDA/VoiceOver)
- ARIA attributes where semantic HTML is insufficient
- Skip navigation links
- Error announcement for form validation
- Focus management on route changes
