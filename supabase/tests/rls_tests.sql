-- Sangham Library RLS test suite.
-- Run by tests/run_local_tests.sh against a scratch database with the
-- migrations and local_auth_stub.sql applied. Every check raises on failure,
-- so a clean exit (ON_ERROR_STOP=1) means all tests passed.

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------

create or replace function public.t_assert(cond boolean, msg text)
returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'ASSERTION FAILED: %', msg;
  end if;
end;
$$;

-- Runs a statement as a role with claims; returns true when it raised
-- insufficient_privilege (permission denied).
create or replace function public.t_denied(stmt text, as_role text, claims jsonb)
returns boolean language plpgsql as $$
begin
  execute format('set local role %I', as_role);
  perform set_config('request.jwt.claims', coalesce(claims::text, ''), true);
  begin
    execute stmt;
  exception when insufficient_privilege then
    reset role;
    return true;
  end;
  reset role;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures (as superuser)
-- ---------------------------------------------------------------------------

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'usera@test.example'),
  ('00000000-0000-0000-0000-00000000000b', 'userb@test.example');

-- Products: a paid guide, a free public series, a draft, and a bundle
insert into public.products (id, slug, product_type, title, status, is_public_access, price_cents, currency) values
  ('10000000-0000-0000-0000-000000000001', 'test-guide', 'guide', 'Test Guide', 'published', false, 34900, 'ZAR'),
  ('10000000-0000-0000-0000-000000000002', 'test-free-audio', 'free_public', 'Test Free Series', 'published', true, null, null),
  ('10000000-0000-0000-0000-000000000003', 'test-draft', 'guide', 'Unreleased Draft', 'draft', false, 10000, 'ZAR'),
  ('10000000-0000-0000-0000-000000000004', 'test-bundle', 'bundle', 'Test Bundle', 'published', false, 49900, 'ZAR'),
  ('10000000-0000-0000-0000-000000000005', 'test-video-course', 'video_course', 'Test Video Course', 'published', false, 79900, 'ZAR');

insert into public.bundle_items (bundle_product_id, child_product_id) values
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005');

insert into public.courses (id, product_id, title) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Test Guide'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Test Free Series'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Draft Course'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'Video Course');

insert into public.modules (id, course_id, title) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Chapters'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Tracks'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'Draft Module'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'Sessions');

insert into public.lessons (id, module_id, product_id, slug, title, lesson_type, body_markdown, is_free_preview) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ch-1', 'Chapter 1', 'text', 'PAID CONTENT A', false),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'preview', 'Preview', 'text', 'PREVIEW CONTENT', true),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'track-1', 'Track 1', 'audio', null, false),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'draft-1', 'Draft Lesson', 'text', 'DRAFT CONTENT', false),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'video-1', 'Session 1', 'video', null, false);

-- Orders: A paid; B pending; unclaimed paid order for C-email
insert into public.orders (id, user_id, email, product_id, amount_cents, currency, status, provider) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'usera@test.example', '10000000-0000-0000-0000-000000000001', 34900, 'ZAR', 'paid', 'payfast'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'userb@test.example', '10000000-0000-0000-0000-000000000001', 34900, 'ZAR', 'pending', 'paypal'),
  ('50000000-0000-0000-0000-000000000003', null, 'userb@test.example', '10000000-0000-0000-0000-000000000004', 49900, 'ZAR', 'paid', 'paypal');

-- Entitlements: A owns the guide (claimed); B has an UNCLAIMED bundle
-- entitlement waiting on email match; A also has a revoked entitlement to
-- the video course (must not grant access).
insert into public.entitlements (id, email, user_id, product_id, status, source, order_id, claimed_at) values
  ('60000000-0000-0000-0000-000000000001', 'usera@test.example', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'active', 'payfast_purchase', '50000000-0000-0000-0000-000000000001', now()),
  ('60000000-0000-0000-0000-000000000002', 'userb@test.example', null, '10000000-0000-0000-0000-000000000004', 'active', 'paypal_purchase', '50000000-0000-0000-0000-000000000003', null),
  ('60000000-0000-0000-0000-000000000003', 'usera@test.example', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000005', 'revoked', 'goodwill', null, now());

commit;

-- ---------------------------------------------------------------------------
-- 1. Anonymous access
-- ---------------------------------------------------------------------------

begin;
set local role anon;
select set_config('request.jwt.claims', '', true);

select public.t_assert(
  (select count(*) from public.products) = 4,
  'anon sees exactly the 4 published products (draft hidden)');

select public.t_assert(
  (select count(*) from public.lessons where product_id = '10000000-0000-0000-0000-000000000001' and not is_free_preview) = 0,
  'anon cannot read paid guide lessons');

select public.t_assert(
  (select count(*) from public.lessons where slug = 'preview') = 1,
  'anon can read free-preview lesson');

select public.t_assert(
  (select count(*) from public.lessons where product_id = '10000000-0000-0000-0000-000000000002') = 1,
  'anon can read free public product lessons (free-layer policy)');

select public.t_assert(
  (select count(*) from public.lessons where slug = 'draft-1') = 0,
  'anon cannot see draft-product lessons');

reset role;
rollback;

-- Anon has no grant at all on member tables
select public.t_assert(
  public.t_denied('select count(*) from public.orders', 'anon', null),
  'anon is denied on orders');
select public.t_assert(
  public.t_denied('select count(*) from public.entitlements', 'anon', null),
  'anon is denied on entitlements');
select public.t_assert(
  public.t_denied('select count(*) from public.payment_events', 'anon', null),
  'anon is denied on payment_events');
select public.t_assert(
  public.t_denied('select count(*) from public.access_logs', 'anon', null),
  'anon is denied on access_logs');
select public.t_assert(
  public.t_denied('select count(*) from public.admin_audit_log', 'anon', null),
  'anon is denied on admin_audit_log');
select public.t_assert(
  public.t_denied('select count(*) from public.content_assets', 'anon', null),
  'anon is denied on content_assets');

-- ---------------------------------------------------------------------------
-- 2. User A (owns the guide)
-- ---------------------------------------------------------------------------

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "usera@test.example", "role": "authenticated"}', true);

select public.t_assert(
  (select body_markdown from public.lessons where slug = 'ch-1') = 'PAID CONTENT A',
  'owner A reads paid guide lesson');

select public.t_assert(
  (select count(*) from public.entitlements) = 2,
  'A sees only own entitlements (2 rows: active guide + revoked video)');

select public.t_assert(
  (select count(*) from public.orders) = 1,
  'A sees only own orders');

select public.t_assert(
  (select count(*) from public.profiles where id <> auth.uid()) = 0,
  'A cannot see other profiles');

-- Revoked entitlement grants nothing
select public.t_assert(
  (select count(*) from public.lessons where slug = 'video-1') = 0,
  'revoked entitlement does not expose video course lessons');

-- Progress writes for owned content succeed
insert into public.course_progress (user_id, lesson_id, status)
values (auth.uid(), '40000000-0000-0000-0000-000000000001', 'completed');

select public.t_assert(
  (select count(*) from public.course_progress) = 1,
  'A wrote and can read own progress');

reset role;
rollback;

-- A cannot insert progress for a product they do not own
-- (RLS WITH CHECK violation surfaces as insufficient_privilege)
select public.t_assert(
  public.t_denied(
    'insert into public.course_progress (user_id, lesson_id, status) values (auth.uid(), ''40000000-0000-0000-0000-000000000005'', ''started'')',
    'authenticated',
    '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "usera@test.example"}'::jsonb),
  'A cannot record progress on unowned video lesson');

-- A cannot update their own role (column not granted)
select public.t_assert(
  public.t_denied(
    'update public.profiles set role = ''admin'' where id = auth.uid()',
    'authenticated',
    '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "usera@test.example"}'::jsonb),
  'A cannot self-elevate to admin');

-- A cannot write orders or entitlements directly
select public.t_assert(
  public.t_denied(
    'insert into public.orders (email, product_id, amount_cents, currency, provider) values (''x@x.example'', ''10000000-0000-0000-0000-000000000001'', 1, ''ZAR'', ''manual'')',
    'authenticated',
    '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "usera@test.example"}'::jsonb),
  'A cannot insert orders');
select public.t_assert(
  public.t_denied(
    'update public.entitlements set status = ''active'' where true',
    'authenticated',
    '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "usera@test.example"}'::jsonb),
  'A cannot update entitlements');

-- ---------------------------------------------------------------------------
-- 3. User B (no claimed entitlements yet) and the claim flow
-- ---------------------------------------------------------------------------

begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-00000000000b", "email": "userb@test.example", "role": "authenticated"}', true);

select public.t_assert(
  (select count(*) from public.lessons where slug = 'ch-1') = 0,
  'B cannot read A''s paid guide lesson');

select public.t_assert(
  (select count(*) from public.entitlements) = 0,
  'B sees no entitlements before claim');

select public.t_assert(
  (select count(*) from public.orders where status = 'paid') = 0,
  'B does not yet see the unclaimed paid order');

-- Claim by verified email
select public.t_assert(
  public.claim_my_entitlements() = 1,
  'B claims exactly one entitlement by email');

select public.t_assert(
  (select count(*) from public.entitlements where user_id = auth.uid() and status = 'active') = 1,
  'claimed entitlement now belongs to B');

-- Bundle entitlement exposes the child product's lessons
select public.t_assert(
  (select count(*) from public.lessons where slug = 'video-1') = 1,
  'bundle entitlement grants child video course lesson');

-- Replaying the claim is harmless
select public.t_assert(
  public.claim_my_entitlements() = 0,
  'second claim call claims nothing (idempotent)');

reset role;
rollback;

-- ---------------------------------------------------------------------------
-- 4. Service role
-- ---------------------------------------------------------------------------

begin;
set local role service_role;
select set_config('request.jwt.claims', '', true);

select public.t_assert(
  (select count(*) from public.entitlements) = 3,
  'service_role sees all entitlements (bypassrls)');

select public.t_assert(
  (select count(*) from public.payment_events) >= 0,
  'service_role reads payment_events');

reset role;
rollback;

select 'ALL RLS TESTS PASSED' as result;
