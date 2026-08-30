-- Sangham Library: storage buckets and policies.
-- Paid content lives in PRIVATE buckets; access is only ever via short-lived
-- signed URLs issued by server code after an entitlement check.
-- The free Stillness series lives in a PUBLIC bucket (never gated by founder policy).
--
-- Guarded so the migration is a no-op on plain PostgreSQL test databases
-- that have no storage schema (local RLS test harness).

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then

    insert into storage.buckets (id, name, public)
    values
      ('paid-assets', 'paid-assets', false),
      ('free-audio', 'free-audio', true),
      ('covers', 'covers', true)
    on conflict (id) do nothing;

    -- No storage.objects policies are created for anon/authenticated on
    -- 'paid-assets': with RLS enabled and no policy, direct client access
    -- fails closed. Signed URLs are generated with the service role.

    -- Public read for the free series and product covers.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'public_read_free_audio'
    ) then
      create policy public_read_free_audio on storage.objects
        for select to anon, authenticated
        using (bucket_id = 'free-audio');
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'public_read_covers'
    ) then
      create policy public_read_covers on storage.objects
        for select to anon, authenticated
        using (bucket_id = 'covers');
    end if;

  end if;
end
$$;
