import { notifyOfficeDataChange, type SyncedTable } from "@/lib/realtime/dataSync";
import type { Repositories } from "./types";

// STEP 3: after a successful Supabase mutation, ping the office data
// channel so open /office views refresh without a reload. The ping only
// names the table — every viewer refetches under their own RLS. Applied
// as a wrapper so the repository implementations stay unchanged.

const TABLE_BY_REPO: Partial<Record<keyof Repositories, SyncedTable>> = {
  profiles: "profiles",
  businessSections: "business_sections",
  announcements: "announcements",
  projects: "projects",
  sectionMetrics: "section_metrics",
  caseStudies: "case_studies",
  meetingRooms: "meeting_rooms",
  meetings: "meetings",
  nextActions: "next_actions",
  tableStoreMetrics: "table_store_metrics",
  tableMenuItems: "table_menu_items",
  greenDeals: "green_deals",
  localProjects: "local_projects",
  executiveMetrics: "executive_metrics",
};

const MUTATIONS = ["create", "update", "remove"] as const;

export function withChangeNotifications(repos: Repositories): Repositories {
  const wrapped = { ...repos };
  for (const [key, table] of Object.entries(TABLE_BY_REPO) as Array<
    [keyof Repositories, SyncedTable]
  >) {
    const repo = repos[key];
    if (typeof repo !== "object" || repo === null) continue;
    const clone: Record<string, unknown> = {
      ...(repo as unknown as Record<string, unknown>),
    };
    for (const method of MUTATIONS) {
      const fn = clone[method];
      if (typeof fn !== "function") continue;
      clone[method] = async (...args: unknown[]) => {
        const result = await (fn as (...a: unknown[]) => Promise<unknown>).apply(
          repo,
          args,
        );
        notifyOfficeDataChange(table);
        return result;
      };
    }
    (wrapped as Record<string, unknown>)[key] = clone;
  }
  return wrapped;
}
