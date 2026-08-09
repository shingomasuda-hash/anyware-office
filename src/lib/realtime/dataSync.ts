"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

// Live office-data sync layer (STEP 3 §12). Panels never call
// supabase.channel(); they read OfficeDataProvider, which subscribes here
// and refetches through the repository layer when notified. Because every
// refresh is an ordinary RLS-scoped SELECT, no viewer can receive rows
// they could not already read — the notification carries a table name
// only, never row data.
//
// Two complementary triggers feed the same debounced refresh:
// 1. postgres_changes — the canonical mechanism; requires the tables to
//    be in the supabase_realtime publication (see
//    supabase/migrations/step3_realtime.sql).
// 2. A "db-change" broadcast sent by the Supabase repositories after
//    each successful mutation — covers projects where the publication
//    has not been enabled yet, and costs one tiny message per admin
//    write either way.

const DATA_TOPIC = "office:data";

/** Office-facing tables, in the STEP 3 priority order. */
export const SYNCED_TABLES = [
  "announcements",
  "projects",
  "section_metrics",
  "meetings",
  "green_deals",
  "meeting_rooms",
  "business_sections",
  "next_actions",
  "local_projects",
  "table_store_metrics",
  "table_menu_items",
  "executive_metrics",
  "case_studies",
  "profiles",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

const DEBOUNCE_MS = 250;

/**
 * Subscribe to office data changes. Returns an unsubscribe function.
 * onChange fires at most once per debounce window regardless of how many
 * tables changed.
 */
export function subscribeOfficeDataChanges(onChange: () => void): () => void {
  const supabase = getSupabaseClient();
  // One socket must not join the same topic twice: clear the notify-only
  // channel and any stale subscriber left by a React re-mount
  // (dev StrictMode) before creating ours.
  notifyChannel = null;
  for (const stale of supabase.getChannels()) {
    if (stale.topic === `realtime:${DATA_TOPIC}`) {
      void supabase.removeChannel(stale);
    }
  }
  let debounce: number | null = null;
  let closed = false;

  const trigger = () => {
    if (closed) return;
    if (debounce !== null) window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      debounce = null;
      onChange();
    }, DEBOUNCE_MS);
  };

  let channel: RealtimeChannel = supabase.channel(DATA_TOPIC, {
    config: { broadcast: { self: true } },
  });
  for (const table of SYNCED_TABLES) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      trigger,
    );
  }
  channel.on("broadcast", { event: "db-change" }, trigger);
  channel.subscribe();

  return () => {
    closed = true;
    if (debounce !== null) window.clearTimeout(debounce);
    void supabase.removeChannel(channel);
  };
}

let notifyChannel: RealtimeChannel | null = null;

/**
 * Fire-and-forget change notification, called by the Supabase
 * repositories after successful mutations. Payload is the table name
 * only. Failures are swallowed — the write itself already succeeded and
 * postgres_changes (when enabled) covers delivery.
 */
export function notifyOfficeDataChange(table: SyncedTable): void {
  try {
    const supabase = getSupabaseClient();
    // Reuse any live channel for this topic (e.g. the office subscriber)
    // — joining the same topic twice on one socket is not allowed.
    const existing = supabase
      .getChannels()
      .find((c) => c.topic === `realtime:${DATA_TOPIC}`);
    const channel =
      existing ??
      (notifyChannel ??= (() => {
        const ch = supabase.channel(DATA_TOPIC, {
          config: { broadcast: { self: true } },
        });
        ch.subscribe();
        return ch;
      })());
    void channel
      .send({ type: "broadcast", event: "db-change", payload: { table } })
      .catch(() => {});
  } catch {
    // Supabase not configured (DEMO) — nothing to notify.
  }
}
