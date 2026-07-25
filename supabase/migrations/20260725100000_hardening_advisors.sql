-- Sangham Library: hardening pass from the hosted Supabase advisors
-- (security + performance linters, first run against the live project).
--
-- Intentionally NOT changed: the six service-role-only tables
-- (product_versions, content_assets, payment_events, entitlement_events,
-- access_logs, admin_audit_log) keep RLS enabled with no policies — that is
-- the fail-closed design, and the linter reports it as INFO only.

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on the remaining functions (linter 0011).
--    All three reference only fully-qualified objects, so '' is safe.
-- ---------------------------------------------------------------------------

alter function public.set_updated_at() set search_path = '';
alter function public.gen_order_ref() set search_path = '';
alter function public.enforce_lesson_product() set search_path = '';

-- ---------------------------------------------------------------------------
-- 2. Function execute grants (linters 0028/0029). Supabase default
--    privileges grant EXECUTE broadly on new functions; tighten to intent:
--    - handle_new_user: trigger-only, never callable via RPC;
--    - claim_my_entitlements: authenticated only (it is a no-op for anon,
--      but there is no reason to expose it);
--    - has_active_entitlement: KEEPS anon + authenticated execute — the
--      lessons/progress policies evaluate it for anonymous readers of
--      free-preview content, and it only ever reports on the caller's own
--      entitlements (auth.uid() is null for anon, so it returns false).
-- ---------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.claim_my_entitlements() from public, anon;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.gen_order_ref() from public, anon, authenticated;
revoke all on function public.enforce_lesson_product() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Public buckets: drop the broad SELECT policies (linter 0025).
--    Objects in public buckets are served via their public URLs without any
--    storage.objects policy; the policies only enabled client-side LISTING
--    of bucket contents, which nothing uses and which over-exposes names.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    drop policy if exists public_read_free_audio on storage.objects;
    drop policy if exists public_read_covers on storage.objects;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS init-plan optimisation (linter 0003): evaluate auth.uid() once per
--    statement instead of per row. Semantics identical.
-- ---------------------------------------------------------------------------

drop policy profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy entitlements_select_own on public.entitlements;
create policy entitlements_select_own on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy progress_select_own on public.course_progress;
create policy progress_select_own on public.course_progress
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy progress_insert_own on public.course_progress;
create policy progress_insert_own on public.course_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.lessons l
      join public.products p on p.id = l.product_id
      where l.id = lesson_id
        and p.status = 'published'
        and (p.is_public_access or l.is_free_preview
             or public.has_active_entitlement(l.product_id))
    )
  );

drop policy progress_update_own on public.course_progress;
create policy progress_update_own on public.course_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy consents_select_own on public.email_consents;
create policy consents_select_own on public.email_consents
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Covering indexes for foreign keys (linter 0001).
-- ---------------------------------------------------------------------------

create index if not exists bundle_items_child_idx on public.bundle_items (child_product_id);
create index if not exists course_progress_lesson_idx on public.course_progress (lesson_id);
create index if not exists email_consents_user_idx on public.email_consents (user_id);
create index if not exists entitlements_product_idx on public.entitlements (product_id);
create index if not exists lessons_content_asset_idx on public.lessons (content_asset_id);
create index if not exists lessons_module_idx on public.lessons (module_id);
create index if not exists modules_course_idx on public.modules (course_id);
create index if not exists orders_product_idx on public.orders (product_id);
