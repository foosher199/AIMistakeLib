# Architecture

`AIMistakeLib` remains one deployable Next.js application, but its code is split by responsibility so the API can become a separate service later without another large cleanup.

## Boundaries

- `app/`, `components/`, and `hooks/` contain the Web client. UI code must not import from `server/`.
- `app/api/` contains thin HTTP route handlers. Authentication, provider integrations, rate limiting, and other server-only implementation belong in `server/`.
- `contracts/` contains request validation and response types that are safe to import from either side.
- `lib/` contains browser-safe utilities and Supabase clients.
- `types/database.ts` is the generated database model; `supabase/` owns schema changes.

ESLint enforces the most important boundary: non-API Web code cannot import `@/server/*`.

## Public API Versioning

Native clients should call `/api/v1/*`. A Next.js rewrite maps those requests to the existing `app/api/*` handlers. Unversioned `/api/*` URLs remain available for the Web client and backwards compatibility; do not add new native-client dependencies on them.

When introducing a breaking contract change, add a new version rather than changing `v1` in place. Keep route handlers transport-focused and put reusable behavior in `server/` so it can later move into `apps/api`.

## Extraction Path

Split into `apps/web`, `apps/api`, and `packages/contracts` only when independent deployment or scaling is required. At that point, `contracts/` moves to the shared package, `server/` moves to the API app, and the current route handlers become adapters or are removed after client migration.
