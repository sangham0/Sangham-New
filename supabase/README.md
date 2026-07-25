# Sangham Library — Supabase Setup

Backend for the Sangham member library: identity, products, orders,
provider-independent entitlements, protected content and admin operations.
Architecture and security model live in the private operating repository
(`the private operating repository: `).

## Status

**No Sangham Supabase project exists yet.** Creating one is a billable,
founder-approval action (see the founder decision log). Do not
reuse the CME project or any project belonging to another product. Everything
here is ready to apply the moment a dedicated project exists.

## One-time project setup (after founder approval)

1. Create a dedicated Supabase project for Sangham (its own organisation is
   cleanest). Region: `eu-west` or the closest region to the primary
   audience; any region works.
2. Apply migrations in order (Supabase CLI: `supabase db push`, or paste each
   file from `supabase/migrations/` into the SQL editor, oldest first).
3. Apply `supabase/seed.sql` **only on non-production/test projects**.
4. Auth settings (Dashboard → Authentication):
   - Enable Email provider, magic links / email OTP. Disable sign-ups with
     password unless the founder wants passwords.
   - Site URL: `https://www.sangham.org`
   - Redirect URLs: `https://www.sangham.org/auth/callback`, the Vercel
     preview URL pattern `https://*-sangham0s-projects.vercel.app/auth/callback`,
     and `http://localhost:4321/auth/callback` for local dev.
   - Email OTP expiry: 3600 s or less. Keep the built-in sender for
     development only; production sends need the founder-approved email
     provider (custom SMTP) with a Sangham sending identity.
5. Storage: migration 300 creates `paid-assets` (private), `free-audio`
   (public), `covers` (public). Upload paid masters only to `paid-assets`.
6. Copy project keys into Vercel env vars per the contract below. The
   service-role key is server-only and must never be exposed to the client
   or committed anywhere.

## Environment-variable contract

| Variable | Where | Purpose |
|---|---|---|
| `PUBLIC_SUPABASE_URL` | client + server | project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | client + server | anon key (RLS is the boundary) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | privileged server operations |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` / `PAYFAST_MODE` | server only | PayFast adapter (`sandbox` or `live`) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` / `PAYPAL_MODE` | server only | PayPal adapter (`sandbox` or `live`) |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` / `EMAIL_FROM` | server only | transactional email adapter (`log` provider = no live sending) |
| `ASSET_SIGN_TTL_SECONDS` | server | signed URL TTL (default 900) |
| `ADMIN_ALERT_EMAIL` | server | fulfilment-failure notifications |

`.env.example` in the repository root documents the same names. Local dev
uses `.env` (gitignored).

## Local testing without any Supabase project

`supabase/tests/run_local_tests.sh` recreates a scratch PostgreSQL database,
applies a small Supabase-emulation stub (`local_auth_stub.sql`: roles,
`auth.users`, `auth.uid()`), applies every migration, and runs the full RLS
test suite (`rls_tests.sql`). A clean exit means every access-control
assertion passed. Requires local PostgreSQL 15+.

```sh
cd supabase/tests && ./run_local_tests.sh
```

## Content ingestion (production content)

Paid content (guide chapters, paid audio) is **never** committed to this
repository. It is loaded directly into the database/storage by the private
ingestion runbook in the operating repository, run with service-role
credentials from a trusted machine. This repo only ever contains `test_`
placeholder content.

## Rollback

See `ROLLBACK_NOTES.md`.
