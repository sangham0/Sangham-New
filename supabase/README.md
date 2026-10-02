# Sangham Library — Supabase Setup

Backend for the Sangham member library: identity, products, orders,
provider-independent entitlements, protected content and admin operations.

## Status (2026-07-25)

**LIVE — the canonical backend exists and is fully migrated.**

| Fact | Value |
|---|---|
| Project name | `Sangham Back-end` |
| Project ref | `uqvuqbwhbrqjynyxzecs` |
| URL (`PUBLIC_SUPABASE_URL`) | `https://uqvuqbwhbrqjynyxzecs.supabase.co` |
| Region | ap-northeast-2 · Postgres 17 |
| Migrations applied | all four (`library_schema`, `library_rls`, `library_storage`, `hardening_advisors`) |
| Buckets | `paid-assets` (private), `free-audio` (public), `covers` (public) |
| Seed | test-only `test_` products applied (remove before launch: `delete from products where slug like 'test\_%' escape '\';`) |
| Real product | `when-meditation-gets-difficult` exists in **draft** (approved subtitle and prices; no content — ingestion is a separate founder-gated step) |
| Advisors | security + performance linters run and remediated (see `migrations/20260725100000_hardening_advisors.sql`); remaining INFO items are the intentional fail-closed service-only tables |
| Hosted RLS suite | full behavioural suite executed against this project: profile trigger, anon isolation, owner access, cross-user isolation, self-elevation and self-grant blocked, claim idempotency, duplicate-grant and replay protection, revoked-entitlement denial — all passed, fixtures cleaned |

The publishable/anon key is public by design (RLS is the security boundary);
fetch it from Dashboard → Settings → API Keys, or via the Supabase MCP
(`get_publishable_keys`). The **service-role key is secret**: dashboard only,
server env only, never committed.

## Remaining dashboard configuration (founder or operator with dashboard access)

These are platform settings without a management-API surface here:

1. **Authentication → URL Configuration**
   - Site URL: `https://www.sangham.org`
   - Redirect URLs:
     - `https://www.sangham.org/auth/callback/`
     - `https://sangham-new-git-*-sangham0s-projects.vercel.app/auth/callback/` (previews)
     - `http://localhost:4321/auth/callback/` (local dev)
2. **Authentication → Sign In / Up**: Email provider on, magic links / email
   OTP; passwords not required. Email OTP expiry ≤ 3600 s.
3. **Authentication → SMTP** (production sends): configure Resend SMTP with
   the `library@sangham.org` identity once DNS is set (founder decision,
   2026-07-25). The built-in sender is fine for testing only.
4. **Vercel env vars** (Project `sangham-new` → Settings → Environment
   Variables) — see the contract below.

## Environment-variable contract

| Variable | Where | Value |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | client + server | `https://uqvuqbwhbrqjynyxzecs.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | client + server | anon/publishable key from the dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | service-role key from the dashboard — never `PUBLIC_`, never committed |
| `PAYFAST_MODE` / `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | server only | sandbox first: `sandbox` / `10000100` / `46f0cd694581a` / `jt7NOE43FZPn` (public documentation test credentials); live values after PayFast verification clears |
| `PAYPAL_MODE` / `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | server only | sandbox REST app credentials from developer.paypal.com (founder account) |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` / `EMAIL_FROM` | server only | `log` (no sending) until Resend is configured; then `resend` + API key + `Sangham <library@sangham.org>` |
| `ASSET_SIGN_TTL_SECONDS` | server | `900` |
| `ACCESS_LOG_SALT` | server | any long random string |
| `ADMIN_ALERT_EMAIL` | server | founder-chosen address |

`.env.example` documents the same names. Local dev uses `.env` (gitignored).

## Applying future migrations

Add a new file under `supabase/migrations/` (never edit an applied one) and
apply with the Supabase MCP (`apply_migration`) or CLI
(`supabase db push --project-ref uqvuqbwhbrqjynyxzecs`). Regenerate
`src/lib/database.types.ts` afterwards.

## Local testing without touching the hosted project

`supabase/tests/run_local_tests.sh` recreates a scratch PostgreSQL database,
applies a small Supabase-emulation stub, applies every migration, and runs
the RLS assertion suite. `scripts/smoke-e2e.mjs` runs 31 end-to-end
assertions against a local `supabase start` stack plus the dev server.

## Content ingestion (production content)

Paid content (guide chapters, paid audio) is **never** committed to this
repository. `scripts/ingest-content.mjs` loads it into the database from a
private local source directory, run with service-role credentials. This repo
only ever contains `test_` placeholder content. Publication (`status =
'published'`) is a separate explicit founder instruction.

## Rollback

See `ROLLBACK_NOTES.md`.
