// STEP 2.5 live acceptance runner — guest / member / admin RLS and CRUD
// against the real Supabase project.
//
//   npm run test:step25
//
// Requires env vars (never printed, never committed):
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
//   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
//   TEST_MEMBER_EMAIL, TEST_MEMBER_PASSWORD
//
// All test rows use the STEP25_TEST_ prefix and are deleted afterwards.
// Seed data touched by tests (section_metrics value, profile fields,
// business_sections tagline) is restored to its original value.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "";
const MEMBER_EMAIL = process.env.TEST_MEMBER_EMAIL ?? "";
const MEMBER_PASSWORD = process.env.TEST_MEMBER_PASSWORD ?? "";

const PREFIX = "STEP25_TEST_";

if (!URL || !KEY) {
  console.error("Missing Supabase configuration env vars");
  process.exit(2);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !MEMBER_EMAIL || !MEMBER_PASSWORD) {
  console.error("Missing STEP 2.5 test credentials");
  process.exit(2);
}

const results = [];
function record(name, pass, note = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${note ? ` — ${note}` : ""}`);
}

function anonClient() {
  return createClient(URL, KEY, { auth: { persistSession: false } });
}

async function loginClient(email, password, label) {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new Error(`${label} login failed: ${error?.message ?? "no user"}`);
  }
  return { client, userId: data.user.id };
}

async function count(client, table) {
  const { data, error } = await client.from(table).select("id");
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data.length;
}

async function expectBlockedWrite(promise) {
  const { data, error } = await promise;
  if (error) return true; // RLS rejected outright
  // UPDATE/DELETE filtered by RLS: no error but zero affected rows.
  return Array.isArray(data) && data.length === 0;
}

async function guestTests() {
  console.log("\n=== GUEST (anonymous) RLS ===");
  const anon = anonClient();

  record(
    "guest sees business_sections = 5",
    (await count(anon, "business_sections")) === 5,
  );
  const annCount = await count(anon, "announcements");
  record("guest sees announcements >= 1", annCount >= 1, `count=${annCount}`);
  const roomCount = await count(anon, "meeting_rooms");
  console.log(`INFO  guest-visible meeting_rooms = ${roomCount}`);

  for (const table of [
    "section_metrics",
    "executive_metrics",
    "green_deals",
    "next_actions",
    "table_store_metrics",
    "table_menu_items",
  ]) {
    record(`guest blocked from ${table}`, (await count(anon, table)) === 0);
  }

  const { data: profiles, error: profErr } = await anon
    .from("profiles")
    .select("id,is_public");
  record(
    "guest sees only public profiles",
    !profErr && profiles.every((p) => p.is_public === true),
  );

  record(
    "guest INSERT announcements rejected",
    await expectBlockedWrite(
      anon
        .from("announcements")
        .insert({ title: `${PREFIX}guest_insert` })
        .select(),
    ),
  );
}

async function memberTests() {
  console.log("\n=== MEMBER RLS ===");
  const { client: member, userId } = await loginClient(
    MEMBER_EMAIL,
    MEMBER_PASSWORD,
    "member",
  );
  record("member login (GoTrue)", true);

  record(
    "member sees section_metrics = 13",
    (await count(member, "section_metrics")) === 13,
  );
  record(
    "member sees executive_metrics = 6",
    (await count(member, "executive_metrics")) === 6,
  );
  record(
    "member sees table_store_metrics = 1",
    (await count(member, "table_store_metrics")) === 1,
  );

  record(
    "member INSERT announcements rejected",
    await expectBlockedWrite(
      member
        .from("announcements")
        .insert({ title: `${PREFIX}member_insert` })
        .select(),
    ),
  );
  record(
    "member UPDATE section_metrics rejected",
    await expectBlockedWrite(
      member.from("section_metrics").update({ value: "999" }).neq("value", "☂").select(),
    ),
  );

  // Other users' profiles must not be updatable.
  record(
    "member UPDATE other profile rejected",
    await expectBlockedWrite(
      member
        .from("profiles")
        .update({ position: `${PREFIX}hacked` })
        .neq("id", userId)
        .select(),
    ),
  );

  // Self role escalation must fail (profiles_self_update with_check).
  const { error: roleErr } = await member
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId)
    .select();
  const { data: roleRow } = await member
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  record(
    "member self role escalation rejected",
    Boolean(roleErr) && roleRow?.role === "member",
    roleErr ? "rejected by RLS with_check" : `role=${roleRow?.role}`,
  );

  // Frozen columns per profiles_self_update: department / is_public /
  // display_order / email.
  const { error: deptErr } = await member
    .from("profiles")
    .update({ department: "MANAGEMENT" })
    .eq("id", userId)
    .select();
  record("member self department change rejected", Boolean(deptErr));

  // Allowed self-service columns.
  const { data: original } = await member
    .from("profiles")
    .select("name,position,status,bio,today_schedule,avatar_url")
    .eq("id", userId)
    .single();
  const { data: updated, error: selfErr } = await member
    .from("profiles")
    .update({
      name: `${PREFIX}self`,
      position: `${PREFIX}pos`,
      status: "away",
      bio: `${PREFIX}bio`,
      today_schedule: `${PREFIX}sched`,
    })
    .eq("id", userId)
    .select()
    .single();
  record(
    "member self update allowed columns",
    !selfErr && updated?.name === `${PREFIX}self`,
    selfErr?.message ?? "",
  );
  // Restore.
  await member.from("profiles").update(original).eq("id", userId);

  await member.auth.signOut();
}

async function adminTests() {
  console.log("\n=== ADMIN RLS / CRUD ===");
  const { client: admin, userId } = await loginClient(
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "admin",
  );
  record("admin login (GoTrue)", true);

  const { data: adminProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  record("admin profile role = admin", adminProfile?.role === "admin");

  // Full create → update → delete on every admin-managed table.
  const crudSpecs = [
    ["announcements", { title: `${PREFIX}ann` }, { title: `${PREFIX}ann_upd` }],
    [
      "projects",
      { title: `${PREFIX}proj`, business_section: "SIGNAL" },
      { progress: 10 },
    ],
    [
      "section_metrics",
      { section_key: "SIGNAL", metric_key: `${PREFIX}metric`, label: `${PREFIX}label` },
      { value: "1" },
    ],
    [
      "case_studies",
      { title: `${PREFIX}case`, section_key: "SIGNAL" },
      { summary: `${PREFIX}summary` },
    ],
    ["meeting_rooms", { name: `${PREFIX}room` }, { description: `${PREFIX}desc` }],
    [
      "meetings",
      {
        title: `${PREFIX}meeting`,
        start_at: "2000-01-01T10:00:00Z",
        end_at: "2000-01-01T11:00:00Z",
      },
      { status: "cancelled" },
    ],
    ["next_actions", { title: `${PREFIX}action` }, { status: "done" }],
    [
      "table_store_metrics",
      { store_name: `${PREFIX}store`, business_date: "2000-01-01" },
      { sales: 1 },
    ],
    [
      "table_menu_items",
      { store_name: `${PREFIX}store`, name: `${PREFIX}item` },
      { price: 1 },
    ],
    ["green_deals", { company_name: `${PREFIX}company` }, { stage: "meeting" }],
    ["local_projects", { title: `${PREFIX}local` }, { area: `${PREFIX}area` }],
    [
      "executive_metrics",
      { metric_key: `${PREFIX}exec`, label: `${PREFIX}label` },
      { value: 1 },
    ],
  ];

  for (const [table, insert, update] of crudSpecs) {
    try {
      const { data: created, error: cErr } = await admin
        .from(table)
        .insert(insert)
        .select()
        .single();
      if (cErr) throw new Error(`insert: ${cErr.message}`);
      const { error: uErr } = await admin
        .from(table)
        .update(update)
        .eq("id", created.id)
        .select()
        .single();
      if (uErr) throw new Error(`update: ${uErr.message}`);
      const { error: dErr } = await admin
        .from(table)
        .delete()
        .eq("id", created.id);
      if (dErr) throw new Error(`delete: ${dErr.message}`);
      record(`admin CRUD ${table}`, true);
    } catch (e) {
      record(`admin CRUD ${table}`, false, String(e.message ?? e));
    }
  }

  // business_sections: fixed 5 rows — update + restore only.
  try {
    const { data: section, error } = await admin
      .from("business_sections")
      .select("id,tagline")
      .eq("section_key", "LOCAL")
      .single();
    if (error) throw new Error(error.message);
    const { error: uErr } = await admin
      .from("business_sections")
      .update({ tagline: `${PREFIX}tagline` })
      .eq("id", section.id)
      .select()
      .single();
    if (uErr) throw new Error(uErr.message);
    await admin
      .from("business_sections")
      .update({ tagline: section.tagline })
      .eq("id", section.id);
    record("admin UPDATE business_sections (restored)", true);
  } catch (e) {
    record("admin UPDATE business_sections (restored)", false, String(e.message ?? e));
  }

  // profiles: edit an existing auth-backed profile and restore (no INSERT).
  try {
    const { data: memberRow, error } = await admin
      .from("profiles")
      .select("id,position")
      .eq("role", "member")
      .limit(1)
      .single();
    if (error) throw new Error(error.message);
    const { error: uErr } = await admin
      .from("profiles")
      .update({ position: `${PREFIX}position` })
      .eq("id", memberRow.id)
      .select()
      .single();
    if (uErr) throw new Error(uErr.message);
    await admin
      .from("profiles")
      .update({ position: memberRow.position })
      .eq("id", memberRow.id);
    record("admin UPDATE existing profile (restored)", true);
  } catch (e) {
    record("admin UPDATE existing profile (restored)", false, String(e.message ?? e));
  }

  // Office Sync (data level): admin writes → correct role sees it → restore.
  try {
    const { data: metric, error } = await admin
      .from("section_metrics")
      .select("id,value")
      .eq("section_key", "SIGNAL")
      .order("display_order", { ascending: true })
      .limit(1)
      .single();
    if (error) throw new Error(error.message);
    await admin
      .from("section_metrics")
      .update({ value: "42" })
      .eq("id", metric.id);
    const { client: member2 } = await loginClient(
      MEMBER_EMAIL,
      MEMBER_PASSWORD,
      "member",
    );
    const { data: seen } = await member2
      .from("section_metrics")
      .select("value")
      .eq("id", metric.id)
      .single();
    await member2.auth.signOut();
    await admin
      .from("section_metrics")
      .update({ value: metric.value })
      .eq("id", metric.id);
    record("office sync: SIGNAL KPI change visible to member (restored)", seen?.value === "42");
  } catch (e) {
    record("office sync: SIGNAL KPI change visible to member (restored)", false, String(e.message ?? e));
  }

  try {
    const { data: ann, error } = await admin
      .from("announcements")
      .insert({
        title: `${PREFIX}sync_announcement`,
        visible_roles: ["guest", "member", "admin"],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const anon = anonClient();
    const { data: seen } = await anon
      .from("announcements")
      .select("id")
      .eq("id", ann.id)
      .maybeSingle();
    await admin.from("announcements").delete().eq("id", ann.id);
    record("office sync: announcement visible to guest (deleted)", Boolean(seen));
  } catch (e) {
    record("office sync: announcement visible to guest (deleted)", false, String(e.message ?? e));
  }

  // Cleanup safety net: remove anything left with the test prefix.
  const cleanupTargets = [
    ["announcements", "title"],
    ["projects", "title"],
    ["section_metrics", "metric_key"],
    ["case_studies", "title"],
    ["meeting_rooms", "name"],
    ["meetings", "title"],
    ["next_actions", "title"],
    ["table_store_metrics", "store_name"],
    ["table_menu_items", "name"],
    ["green_deals", "company_name"],
    ["local_projects", "title"],
    ["executive_metrics", "metric_key"],
  ];
  for (const [table, column] of cleanupTargets) {
    await admin.from(table).delete().like(column, `${PREFIX}%`);
  }
  console.log("INFO  cleanup of STEP25_TEST_ rows completed");

  await admin.auth.signOut();
}

try {
  await guestTests();
  await memberTests();
  await adminTests();
} catch (e) {
  console.error(`\nRUNNER ERROR: ${e.message ?? e}`);
  console.error(
    "If this is a network error, supabase.co may be blocked by the environment's network policy.",
  );
  process.exit(3);
}

const failed = results.filter((r) => !r.pass);
console.log(
  `\n=== STEP 2.5 ACCEPTANCE: ${results.length - failed.length}/${results.length} PASS ===`,
);
process.exit(failed.length ? 1 : 0);
