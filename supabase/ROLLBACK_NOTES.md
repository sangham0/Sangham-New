# Supabase Migration Rollback Notes — Sangham Library

Migrations are additive and ordered. Rollback direction is newest-first.
Once real customer data exists, **never** drop commerce tables (`orders`,
`payment_events`, `entitlements`, `entitlement_events`, `admin_audit_log`);
roll the application back instead and leave data in place.

## 20260723000300_library_storage.sql

Creates buckets `paid-assets` (private), `free-audio` (public), `covers`
(public) and two public-read storage policies.

Rollback:

```sql
drop policy if exists public_read_free_audio on storage.objects;
drop policy if exists public_read_covers on storage.objects;
delete from storage.buckets where id in ('paid-assets', 'free-audio', 'covers');
-- Objects must be deleted from the buckets first if any were uploaded.
```

## 20260723000200_library_rls.sql

Creates access functions, grants and all RLS policies.

Rollback (returns database to no-client-access state — fail closed):

```sql
drop function if exists public.claim_my_entitlements();
drop function if exists public.has_active_entitlement(uuid);
-- Dropping a table's policies while RLS stays enabled removes all client
-- access; that is the safe direction.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
revoke all on all tables in schema public from anon, authenticated;
```

## 20260723000100_library_schema.sql

Creates all Sangham Library tables, triggers and helper functions.

Rollback (ONLY safe before production data exists):

```sql
drop table if exists public.admin_audit_log, public.email_consents,
  public.access_logs, public.course_progress, public.entitlement_events,
  public.entitlements, public.payment_events, public.orders,
  public.lessons, public.content_assets, public.modules, public.courses,
  public.bundle_items, public.product_versions, public.products,
  public.profiles cascade;
drop function if exists public.enforce_lesson_product(), public.handle_new_user(),
  public.gen_order_ref(), public.set_updated_at() cascade;
drop sequence if exists public.order_ref_seq;
drop trigger if exists on_auth_user_created on auth.users;
```

## Operational rollback principles

1. Application rollback (Vercel deployment rollback) is always preferred over
   schema rollback.
2. Entitlement problems are fixed by **state transitions with events**
   (suspend/revoke/restore via admin tooling), never by row deletion.
3. Before any schema rollback in production: `pg_dump` snapshot first, and a
   logged founder decision if customer data is affected.
4. Seed data is test-only (`test_` slugs); removing it is always safe:
   `delete from products where slug like 'test\_%' escape '\';` (cascades).
