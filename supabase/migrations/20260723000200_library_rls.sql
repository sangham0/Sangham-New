-- Sangham Library: row-level security, grants and access functions
-- Failure posture: fail closed. Tables without policies for a role are
-- invisible to that role. Service-role bypasses RLS by design (server only).

-- ---------------------------------------------------------------------------
-- Access helper functions
-- ---------------------------------------------------------------------------

-- True when the calling user holds an active, unexpired entitlement for the
-- product, directly or via a bundle. SECURITY DEFINER so policies can use it
-- without exposing other users' entitlement rows.
create or replace function public.has_active_entitlement(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.user_id = auth.uid()
      and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and (
        e.product_id = p_product_id
        or exists (
          select 1 from public.bundle_items bi
          where bi.bundle_product_id = e.product_id
            and bi.child_product_id = p_product_id
        )
      )
  );
$$;

revoke all on function public.has_active_entitlement(uuid) from public;
grant execute on function public.has_active_entitlement(uuid) to authenticated, anon, service_role;

-- Claims all unclaimed entitlements (and pending orders) whose email matches
-- the caller's verified auth email. Called after login/claim.
create or replace function public.claim_my_entitlements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', ''));
  v_count integer := 0;
  r record;
begin
  if v_uid is null or v_email = '' then
    return 0;
  end if;

  for r in
    update public.entitlements e
    set user_id = v_uid, claimed_at = now()
    where e.user_id is null
      and lower(e.email) = v_email
    returning e.id
  loop
    insert into public.entitlement_events (entitlement_id, event, reason, actor)
    values (r.id, 'claimed', 'claimed by verified email match', 'user:' || v_uid::text);
    v_count := v_count + 1;
  end loop;

  update public.orders o
  set user_id = v_uid
  where o.user_id is null
    and lower(o.email) = v_email;

  return v_count;
end;
$$;

revoke all on function public.claim_my_entitlements() from public;
grant execute on function public.claim_my_entitlements() to authenticated;

-- ---------------------------------------------------------------------------
-- Lock down default access, then grant narrowly
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

-- Catalogue: readable by everyone (RLS filters to published rows)
grant select on public.products, public.bundle_items, public.courses,
  public.modules, public.lessons to anon, authenticated;

-- Member data: readable by the owner (RLS enforces row scope)
grant select on public.profiles, public.orders, public.entitlements,
  public.course_progress, public.email_consents to authenticated;

-- Narrow writes
grant update (display_name) on public.profiles to authenticated;
grant insert, update on public.course_progress to authenticated;

-- service_role retains full access (Supabase default; restated for clarity)
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_versions enable row level security;
alter table public.bundle_items enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.content_assets enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.entitlement_events enable row level security;
alter table public.course_progress enable row level security;
alter table public.access_logs enable row level security;
alter table public.email_consents enable row level security;
alter table public.admin_audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- profiles: owner reads and updates (column grant restricts to display_name)
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- products: published catalogue is public
create policy products_select_published on public.products
  for select to anon, authenticated
  using (status = 'published');

-- bundle_items: visible when the bundle product is published
create policy bundle_items_select on public.bundle_items
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = bundle_product_id and p.status = 'published'
  ));

-- courses/modules: visible when the owning product is published
create policy courses_select on public.courses
  for select to anon, authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'published'
  ));

create policy modules_select on public.modules
  for select to anon, authenticated
  using (exists (
    select 1 from public.courses c
    join public.products p on p.id = c.product_id
    where c.id = course_id and p.status = 'published'
  ));

-- lessons: the core paid-content rule.
-- Readable when the product is published AND one of:
--   1. the product carries explicit public access (free public layer);
--   2. the lesson is a free preview;
--   3. the caller holds an active entitlement (direct or bundle).
create policy lessons_select_entitled on public.lessons
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id
        and p.status = 'published'
        and (
          p.is_public_access
          or is_free_preview
          or public.has_active_entitlement(product_id)
        )
    )
  );

-- orders: owners read their own
create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = auth.uid());

-- entitlements: owners read their own
create policy entitlements_select_own on public.entitlements
  for select to authenticated
  using (user_id = auth.uid());

-- course_progress: owners read and write their own, and only for lessons
-- they can legitimately access.
create policy progress_select_own on public.course_progress
  for select to authenticated
  using (user_id = auth.uid());

create policy progress_insert_own on public.course_progress
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.lessons l
      join public.products p on p.id = l.product_id
      where l.id = lesson_id
        and p.status = 'published'
        and (p.is_public_access or l.is_free_preview
             or public.has_active_entitlement(l.product_id))
    )
  );

create policy progress_update_own on public.course_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- email_consents: owners may read their own consent records
create policy consents_select_own on public.email_consents
  for select to authenticated
  using (user_id = auth.uid());

-- No policies (therefore no client access, any role):
--   product_versions, content_assets, payment_events, entitlement_events,
--   access_logs, admin_audit_log.
-- These are service-role-only surfaces used by server code and admin tooling.
