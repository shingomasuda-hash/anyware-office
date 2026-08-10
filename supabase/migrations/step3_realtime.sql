-- STEP 3 realtime enablement.
--
-- Apply with the Supabase SQL editor or CLI (requires the postgres /
-- service role — this is intentionally NOT applied from the app, which
-- only ever holds the publishable key).
--
-- Safety: this migration only creates/replaces two policies on
-- realtime.messages and adds tables to the supabase_realtime
-- publication. It never drops tables, truncates, or deletes data, and
-- it is idempotent — running it twice is safe.
--
-- Behavior before/after applying:
--   * BEFORE (production): the office presence channel fails closed —
--     the office works normally, but presence/broadcast stay OFFLINE.
--     Employee presence is never sent over a public topic in production.
--     (Development/test builds may fall back to a public channel so the
--     feature can be exercised without this migration.)
--   * AFTER: members/admins join the private "office:v1" channel and
--     postgres_changes deliver DB-level updates for all writers.

-- ── 1. Realtime Authorization: private office channel ────────────────
-- Members and admins may read/write presence + broadcast on the
-- "office:v1" topic. Guests (anon) and users without a member/admin
-- profile are rejected at channel join. drop-then-create keeps the
-- migration re-runnable without touching anything else.

drop policy if exists "office members read realtime" on realtime.messages;
create policy "office members read realtime"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'office:v1'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('member', 'admin')
    )
  );

drop policy if exists "office members write realtime" on realtime.messages;
create policy "office members write realtime"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'office:v1'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('member', 'admin')
    )
  );

-- ── 2. Postgres Changes: publish office data tables ──────────────────
-- Postgres Changes respects RLS: each subscriber only receives rows
-- their role can already SELECT. Guarded so re-running the migration
-- (or a table already being published) is not an error.

do $$
declare
  t text;
begin
  foreach t in array array[
    'announcements',
    'projects',
    'section_metrics',
    'meetings',
    'green_deals',
    'meeting_rooms',
    'business_sections',
    'next_actions',
    'local_projects',
    'table_store_metrics',
    'table_menu_items',
    'executive_metrics',
    'case_studies',
    'profiles'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        t
      );
    end if;
  end loop;
end
$$;
