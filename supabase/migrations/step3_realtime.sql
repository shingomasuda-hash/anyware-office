-- STEP 3 realtime enablement.
--
-- Apply with the Supabase SQL editor or CLI (requires the postgres /
-- service role — this is intentionally NOT applied from the app, which
-- only ever holds the publishable key).
--
-- The app works before this migration is applied:
--   * presence/movement fall back to a public channel with the same
--     minimal payload (no email, no tokens),
--   * office data refreshes are driven by repository write
--     notifications instead of postgres_changes.
-- After applying, the office channel upgrades itself to a private
-- (authorized) channel on the next page load and postgres_changes
-- deliver DB-level updates for all writers.

-- ── 1. Realtime Authorization: private office channel ────────────────
-- Members and admins may read/write presence + broadcast on the
-- "office:v1" topic. Guests (anon) and users without a member/admin
-- profile are rejected at channel join.

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
-- their role can already SELECT.

alter publication supabase_realtime add table
  public.announcements,
  public.projects,
  public.section_metrics,
  public.meetings,
  public.green_deals,
  public.meeting_rooms,
  public.business_sections,
  public.next_actions,
  public.local_projects,
  public.table_store_metrics,
  public.table_menu_items,
  public.executive_metrics,
  public.case_studies,
  public.profiles;
