-- Sangham Library: core schema
-- Provider-independent commerce and entitlement foundation.
-- Rollback notes: supabase/ROLLBACK_NOTES.md

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create sequence if not exists public.order_ref_seq;

create or replace function public.gen_order_ref()
returns text
language sql
volatile
as $$
  select 'SG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_ref_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- products and catalogue
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  product_type text not null check (product_type in
    ('guide', 'audio_course', 'video_course', 'mixed_course', 'bundle', 'free_public')),
  title text not null,
  subtitle text,
  description text,
  status text not null default 'draft' check (status in
    ('draft', 'unpublished', 'published', 'archived')),
  -- Founder policy: free public products carry an explicit public-access state.
  -- Free access is never modelled as a paid entitlement.
  is_public_access boolean not null default false,
  -- Primary (PayFast/ZAR) price. PayFast settles ZAR only.
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  -- PayPal/international price. SA PayPal accounts cannot hold ZAR, so the
  -- PayPal path charges USD. Null = product not purchasable via PayPal.
  price_usd_cents integer check (price_usd_cents is null or price_usd_cents >= 0),
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_products_have_price check (
    is_public_access or product_type = 'bundle' or status <> 'published' or price_cents is not null
  )
);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  version_label text not null,
  content_sha256 text,
  notes text,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (product_id, version_label)
);

create table public.bundle_items (
  bundle_product_id uuid not null references public.products (id) on delete cascade,
  child_product_id uuid not null references public.products (id) on delete cascade,
  primary key (bundle_product_id, child_product_id),
  check (bundle_product_id <> child_product_id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  title text not null,
  summary text,
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('audio', 'video', 'pdf', 'image', 'markdown')),
  storage_bucket text,
  storage_path text,
  external_provider text,
  external_ref text,
  sha256 text,
  bytes bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  constraint asset_has_location check (
    storage_path is not null or external_ref is not null
  )
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  -- Denormalised for efficient RLS checks; kept consistent by trigger below.
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order integer not null default 0,
  slug text not null,
  title text not null,
  lesson_type text not null check (lesson_type in ('text', 'audio', 'video')),
  body_markdown text,
  content_asset_id uuid references public.content_assets (id) on delete set null,
  duration_seconds integer,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, slug)
);

create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create or replace function public.enforce_lesson_product()
returns trigger
language plpgsql
as $$
declare
  v_product uuid;
begin
  select c.product_id into v_product
  from public.modules m
  join public.courses c on c.id = m.course_id
  where m.id = new.module_id;

  if v_product is null then
    raise exception 'module % has no course/product', new.module_id;
  end if;

  if new.product_id is distinct from v_product then
    raise exception 'lesson product_id must match its module''s product (% <> %)', new.product_id, v_product;
  end if;

  return new;
end;
$$;

create trigger lessons_product_consistency
  before insert or update on public.lessons
  for each row execute function public.enforce_lesson_product();

-- ---------------------------------------------------------------------------
-- orders and payment events
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique default public.gen_order_ref(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  product_id uuid not null references public.products (id),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'pending' check (status in
    ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
  provider text not null check (provider in ('payfast', 'paypal', 'manual', 'sponsored')),
  provider_order_ref text,
  test_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index orders_user_idx on public.orders (user_id);
create index orders_email_idx on public.orders (lower(email));
create index orders_provider_ref_idx on public.orders (provider, provider_order_ref);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('payfast', 'paypal', 'manual', 'sponsored')),
  -- Idempotency: replayed provider notifications violate this constraint and
  -- are treated as already-processed (no state change).
  provider_event_id text not null,
  order_id uuid references public.orders (id) on delete set null,
  event_type text not null,
  amount_cents integer,
  currency text,
  signature_valid boolean,
  raw jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index payment_events_order_idx on public.payment_events (order_id);

-- ---------------------------------------------------------------------------
-- entitlements
-- ---------------------------------------------------------------------------

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  -- Identity at grant time. user_id attaches at claim (or immediately for
  -- authenticated purchases).
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid not null references public.products (id),
  status text not null default 'active' check (status in
    ('active', 'suspended', 'revoked', 'expired')),
  source text not null check (source in
    ('payfast_purchase', 'paypal_purchase', 'sponsored', 'manual_grant',
     'bundle', 'subscription', 'migration', 'goodwill')),
  order_id uuid references public.orders (id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger entitlements_updated_at
  before update on public.entitlements
  for each row execute function public.set_updated_at();

-- One entitlement per order+product: webhook replay cannot double-grant.
create unique index entitlements_order_product_uniq
  on public.entitlements (order_id, product_id)
  where order_id is not null;

create index entitlements_user_idx on public.entitlements (user_id);
create index entitlements_unclaimed_email_idx
  on public.entitlements (lower(email))
  where user_id is null;

create table public.entitlement_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  event text not null check (event in
    ('granted', 'claimed', 'suspended', 'revoked', 'restored', 'expired')),
  reason text,
  actor text not null default 'system',
  created_at timestamptz not null default now()
);

create index entitlement_events_entitlement_idx
  on public.entitlement_events (entitlement_id);

-- ---------------------------------------------------------------------------
-- progress, access logs, consent, admin audit
-- ---------------------------------------------------------------------------

create table public.course_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  position_seconds integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.access_logs (
  id bigint generated always as identity primary key,
  user_id uuid,
  product_id uuid,
  lesson_id uuid,
  asset_id uuid,
  action text not null check (action in ('view', 'stream', 'sign_url', 'denied')),
  -- Salted hash only; raw IP is never stored (POPIA data-minimisation).
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index access_logs_user_idx on public.access_logs (user_id, created_at);
create index access_logs_product_idx on public.access_logs (product_id, created_at);

create table public.email_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  purpose text not null check (purpose in ('transactional', 'newsletter')),
  status text not null check (status in
    ('granted', 'pending_double_opt_in', 'withdrawn')),
  source text,
  consent_text_version text,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index email_consents_email_purpose_uniq
  on public.email_consents (lower(email), purpose);

create trigger email_consents_updated_at
  before update on public.email_consents
  for each row execute function public.set_updated_at();

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  action text not null,
  target_table text,
  target_id text,
  reason text,
  meta jsonb,
  created_at timestamptz not null default now()
);
