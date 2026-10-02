-- Sangham Library: TEST-ONLY seed data.
-- Never run against production. Real products are created by the private
-- content-ingestion runbook (see supabase/README.md) so that paid content
-- never enters public source control.
--
-- Slug convention: everything here is prefixed test_ so test data remains
-- distinguishable from production data at a glance.

insert into public.products (slug, product_type, title, subtitle, description, status, is_public_access, price_cents, currency, price_usd_cents)
values
  ('test_guide', 'guide', 'Test Guide Product', 'A placeholder written guide',
   'Placeholder product proving the guide architecture. Not a real product.',
   'published', false, 34900, 'ZAR', 1900),
  ('test_audio_course', 'audio_course', 'Test Audio Course', 'A placeholder audio course',
   'Placeholder audio course proving entitlement-checked playback.',
   'published', false, 44900, 'ZAR', 2500),
  ('test_video_course', 'video_course', 'Test Video Course', 'A placeholder video course',
   'Placeholder proving the video-ready lesson architecture. No video provider is active.',
   'unpublished', false, 79900, 'ZAR', 4500),
  ('test_bundle', 'bundle', 'Test Bundle', 'Guide + audio placeholder bundle',
   'Placeholder bundle proving bundle entitlements.',
   'unpublished', false, 59900, 'ZAR', 3400),
  ('test_free_series', 'free_public', 'Test Free Series', 'Placeholder free public audio',
   'Placeholder for the permanently free Stillness series slot (free layer: public, never gated).',
   'published', true, null, null, null)
on conflict (slug) do nothing;

-- Bundle composition
insert into public.bundle_items (bundle_product_id, child_product_id)
select b.id, c.id
from public.products b, public.products c
where b.slug = 'test_bundle' and c.slug in ('test_guide', 'test_audio_course')
on conflict do nothing;

-- Course scaffolding for each content product
insert into public.courses (product_id, title, summary)
select p.id, p.title, 'Test course container'
from public.products p
where p.slug in ('test_guide', 'test_audio_course', 'test_video_course', 'test_free_series')
on conflict (product_id) do nothing;

insert into public.modules (course_id, sort_order, title)
select c.id, 1, 'Part One'
from public.courses c
join public.products p on p.id = c.product_id
where p.slug in ('test_guide', 'test_audio_course', 'test_video_course', 'test_free_series')
  and not exists (select 1 from public.modules m where m.course_id = c.id);

-- Text lessons for the test guide (one free preview, one paid)
insert into public.lessons (module_id, product_id, sort_order, slug, title, lesson_type, body_markdown, is_free_preview)
select m.id, p.id, 1, 'test-preview', 'Test Preview Chapter', 'text',
       'This is TEST preview content. If you can read this without an account, free-preview access works.', true
from public.modules m
join public.courses c on c.id = m.course_id
join public.products p on p.id = c.product_id
where p.slug = 'test_guide'
on conflict (product_id, slug) do nothing;

insert into public.lessons (module_id, product_id, sort_order, slug, title, lesson_type, body_markdown, is_free_preview)
select m.id, p.id, 2, 'test-chapter-1', 'Test Chapter One', 'text',
       'This is TEST paid content. If you can read this without an active entitlement, access control is broken.', false
from public.modules m
join public.courses c on c.id = m.course_id
join public.products p on p.id = c.product_id
where p.slug = 'test_guide'
on conflict (product_id, slug) do nothing;

-- Audio lesson placeholder (no real asset; storage path points at a
-- test object uploaded during smoke testing)
insert into public.lessons (module_id, product_id, sort_order, slug, title, lesson_type, is_free_preview)
select m.id, p.id, 1, 'test-track-1', 'Test Track One', 'audio', false
from public.modules m
join public.courses c on c.id = m.course_id
join public.products p on p.id = c.product_id
where p.slug = 'test_audio_course'
on conflict (product_id, slug) do nothing;

-- Video lesson placeholder proving the video-ready schema (no provider active)
insert into public.lessons (module_id, product_id, sort_order, slug, title, lesson_type, is_free_preview)
select m.id, p.id, 1, 'test-session-1', 'Test Video Session One', 'video', false
from public.modules m
join public.courses c on c.id = m.course_id
join public.products p on p.id = c.product_id
where p.slug = 'test_video_course'
on conflict (product_id, slug) do nothing;

-- Free public lesson (free-layer policy proof: readable with no account)
insert into public.lessons (module_id, product_id, sort_order, slug, title, lesson_type, is_free_preview)
select m.id, p.id, 1, 'test-free-track-1', 'Test Free Track One', 'audio', false
from public.modules m
join public.courses c on c.id = m.course_id
join public.products p on p.id = c.product_id
where p.slug = 'test_free_series'
on conflict (product_id, slug) do nothing;
