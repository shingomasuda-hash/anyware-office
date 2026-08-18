import { getSupabaseClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import { RepositoryError } from "./errors";
import type { Repositories } from "./types";

// Supabase-backed repositories. Every error surfaces as RepositoryError —
// a configured Supabase source must never silently degrade to demo data.
// Reads run under RLS: anonymous (guest) clients legitimately receive 0
// rows from member-only tables, which is NOT an error.

interface DbError {
  message: string;
  code?: string;
}

function wrap(op: string, error: DbError): RepositoryError {
  return new RepositoryError(`${op} failed: ${error.message}`, error);
}

function rows<T>(op: string, data: T[] | null, error: DbError | null): T[] {
  if (error) throw wrap(op, error);
  return data ?? [];
}

function row<T>(op: string, data: T | null, error: DbError | null): T {
  if (error) throw wrap(op, error);
  if (data === null) throw new RepositoryError(`${op} returned no row`);
  return data;
}

const db = () => getSupabaseClient();

/** PostgREST codes for "that relation does not exist". */
const MISSING_TABLE = new Set(["PGRST205", "PGRST202", "42P01"]);

export function createSupabaseRepositories(): Repositories {
  return {
    source: "SUPABASE",

    profiles: {
      async list() {
        const { data, error } = await db()
          .from("profiles")
          .select("*")
          .order("display_order", { ascending: true });
        return rows("profiles.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("profiles.get", error);
        return data;
      },
      async update(id, input: TablesUpdate<"profiles">) {
        const { data, error } = await db()
          .from("profiles")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("profiles.update", data, error);
      },
    },

    businessSections: {
      async list() {
        const { data, error } = await db()
          .from("business_sections")
          .select("*")
          .order("display_order", { ascending: true });
        return rows("business_sections.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("business_sections")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("business_sections.get", error);
        return data;
      },
      async create(input: TablesInsert<"business_sections">) {
        const { data, error } = await db()
          .from("business_sections")
          .insert(input)
          .select("*")
          .single();
        return row("business_sections.create", data, error);
      },
      async update(id, input: TablesUpdate<"business_sections">) {
        const { data, error } = await db()
          .from("business_sections")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("business_sections.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("business_sections")
          .delete()
          .eq("id", id);
        if (error) throw wrap("business_sections.remove", error);
      },
    },

    announcements: {
      async list() {
        const { data, error } = await db()
          .from("announcements")
          .select("*")
          .order("published_at", { ascending: false });
        return rows("announcements.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("announcements")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("announcements.get", error);
        return data;
      },
      async create(input: TablesInsert<"announcements">) {
        const { data, error } = await db()
          .from("announcements")
          .insert(input)
          .select("*")
          .single();
        return row("announcements.create", data, error);
      },
      async update(id, input: TablesUpdate<"announcements">) {
        const { data, error } = await db()
          .from("announcements")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("announcements.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("announcements")
          .delete()
          .eq("id", id);
        if (error) throw wrap("announcements.remove", error);
      },
    },

    projects: {
      async list() {
        const { data, error } = await db()
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        return rows("projects.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("projects")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("projects.get", error);
        return data;
      },
      async create(input: TablesInsert<"projects">) {
        const { data, error } = await db()
          .from("projects")
          .insert(input)
          .select("*")
          .single();
        return row("projects.create", data, error);
      },
      async update(id, input: TablesUpdate<"projects">) {
        const { data, error } = await db()
          .from("projects")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("projects.update", data, error);
      },
      async remove(id) {
        const { error } = await db().from("projects").delete().eq("id", id);
        if (error) throw wrap("projects.remove", error);
      },
    },

    sectionMetrics: {
      async list() {
        const { data, error } = await db()
          .from("section_metrics")
          .select("*")
          .order("display_order", { ascending: true });
        return rows("section_metrics.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("section_metrics")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("section_metrics.get", error);
        return data;
      },
      async create(input: TablesInsert<"section_metrics">) {
        const { data, error } = await db()
          .from("section_metrics")
          .insert(input)
          .select("*")
          .single();
        return row("section_metrics.create", data, error);
      },
      async update(id, input: TablesUpdate<"section_metrics">) {
        const { data, error } = await db()
          .from("section_metrics")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("section_metrics.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("section_metrics")
          .delete()
          .eq("id", id);
        if (error) throw wrap("section_metrics.remove", error);
      },
    },

    caseStudies: {
      async list() {
        const { data, error } = await db()
          .from("case_studies")
          .select("*")
          .order("display_order", { ascending: true });
        return rows("case_studies.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("case_studies")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("case_studies.get", error);
        return data;
      },
      async create(input: TablesInsert<"case_studies">) {
        const { data, error } = await db()
          .from("case_studies")
          .insert(input)
          .select("*")
          .single();
        return row("case_studies.create", data, error);
      },
      async update(id, input: TablesUpdate<"case_studies">) {
        const { data, error } = await db()
          .from("case_studies")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("case_studies.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("case_studies")
          .delete()
          .eq("id", id);
        if (error) throw wrap("case_studies.remove", error);
      },
    },

    meetingRooms: {
      async list() {
        const { data, error } = await db()
          .from("meeting_rooms")
          .select("*")
          .order("created_at", { ascending: true });
        return rows("meeting_rooms.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("meeting_rooms")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("meeting_rooms.get", error);
        return data;
      },
      async create(input: TablesInsert<"meeting_rooms">) {
        const { data, error } = await db()
          .from("meeting_rooms")
          .insert(input)
          .select("*")
          .single();
        return row("meeting_rooms.create", data, error);
      },
      async update(id, input: TablesUpdate<"meeting_rooms">) {
        const { data, error } = await db()
          .from("meeting_rooms")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("meeting_rooms.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("meeting_rooms")
          .delete()
          .eq("id", id);
        if (error) throw wrap("meeting_rooms.remove", error);
      },
    },

    meetings: {
      async list() {
        const { data, error } = await db()
          .from("meetings")
          .select("*")
          .order("start_at", { ascending: true });
        return rows("meetings.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("meetings")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("meetings.get", error);
        return data;
      },
      async create(input: TablesInsert<"meetings">) {
        const { data, error } = await db()
          .from("meetings")
          .insert(input)
          .select("*")
          .single();
        return row("meetings.create", data, error);
      },
      async update(id, input: TablesUpdate<"meetings">) {
        const { data, error } = await db()
          .from("meetings")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("meetings.update", data, error);
      },
      async remove(id) {
        const { error } = await db().from("meetings").delete().eq("id", id);
        if (error) throw wrap("meetings.remove", error);
      },
    },

    nextActions: {
      async list() {
        const { data, error } = await db()
          .from("next_actions")
          .select("*")
          .order("created_at", { ascending: false });
        return rows("next_actions.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("next_actions")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("next_actions.get", error);
        return data;
      },
      async create(input: TablesInsert<"next_actions">) {
        const { data, error } = await db()
          .from("next_actions")
          .insert(input)
          .select("*")
          .single();
        return row("next_actions.create", data, error);
      },
      async update(id, input: TablesUpdate<"next_actions">) {
        const { data, error } = await db()
          .from("next_actions")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("next_actions.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("next_actions")
          .delete()
          .eq("id", id);
        if (error) throw wrap("next_actions.remove", error);
      },
    },

    tableStoreMetrics: {
      async list() {
        const { data, error } = await db()
          .from("table_store_metrics")
          .select("*")
          .order("business_date", { ascending: false });
        return rows("table_store_metrics.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("table_store_metrics")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("table_store_metrics.get", error);
        return data;
      },
      async create(input: TablesInsert<"table_store_metrics">) {
        const { data, error } = await db()
          .from("table_store_metrics")
          .insert(input)
          .select("*")
          .single();
        return row("table_store_metrics.create", data, error);
      },
      async update(id, input: TablesUpdate<"table_store_metrics">) {
        const { data, error } = await db()
          .from("table_store_metrics")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("table_store_metrics.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("table_store_metrics")
          .delete()
          .eq("id", id);
        if (error) throw wrap("table_store_metrics.remove", error);
      },
    },

    tableMenuItems: {
      async list() {
        const { data, error } = await db()
          .from("table_menu_items")
          .select("*")
          .order("display_order", { ascending: true });
        return rows("table_menu_items.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("table_menu_items")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("table_menu_items.get", error);
        return data;
      },
      async create(input: TablesInsert<"table_menu_items">) {
        const { data, error } = await db()
          .from("table_menu_items")
          .insert(input)
          .select("*")
          .single();
        return row("table_menu_items.create", data, error);
      },
      async update(id, input: TablesUpdate<"table_menu_items">) {
        const { data, error } = await db()
          .from("table_menu_items")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("table_menu_items.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("table_menu_items")
          .delete()
          .eq("id", id);
        if (error) throw wrap("table_menu_items.remove", error);
      },
    },

    greenDeals: {
      async list() {
        const { data, error } = await db()
          .from("green_deals")
          .select("*")
          .order("created_at", { ascending: false });
        return rows("green_deals.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("green_deals")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("green_deals.get", error);
        return data;
      },
      async create(input: TablesInsert<"green_deals">) {
        const { data, error } = await db()
          .from("green_deals")
          .insert(input)
          .select("*")
          .single();
        return row("green_deals.create", data, error);
      },
      async update(id, input: TablesUpdate<"green_deals">) {
        const { data, error } = await db()
          .from("green_deals")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("green_deals.update", data, error);
      },
      async remove(id) {
        const { error } = await db().from("green_deals").delete().eq("id", id);
        if (error) throw wrap("green_deals.remove", error);
      },
    },

    localProjects: {
      async list() {
        const { data, error } = await db()
          .from("local_projects")
          .select("*")
          .order("created_at", { ascending: false });
        return rows("local_projects.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("local_projects")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("local_projects.get", error);
        return data;
      },
      async create(input: TablesInsert<"local_projects">) {
        const { data, error } = await db()
          .from("local_projects")
          .insert(input)
          .select("*")
          .single();
        return row("local_projects.create", data, error);
      },
      async update(id, input: TablesUpdate<"local_projects">) {
        const { data, error } = await db()
          .from("local_projects")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("local_projects.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("local_projects")
          .delete()
          .eq("id", id);
        if (error) throw wrap("local_projects.remove", error);
      },
    },

    executiveMetrics: {
      async list() {
        const { data, error } = await db()
          .from("executive_metrics")
          .select("*")
          .order("created_at", { ascending: true });
        return rows("executive_metrics.list", data, error);
      },
      async get(id) {
        const { data, error } = await db()
          .from("executive_metrics")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw wrap("executive_metrics.get", error);
        return data;
      },
      async create(input: TablesInsert<"executive_metrics">) {
        const { data, error } = await db()
          .from("executive_metrics")
          .insert(input)
          .select("*")
          .single();
        return row("executive_metrics.create", data, error);
      },
      async update(id, input: TablesUpdate<"executive_metrics">) {
        const { data, error } = await db()
          .from("executive_metrics")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("executive_metrics.update", data, error);
      },
      async remove(id) {
        const { error } = await db()
          .from("executive_metrics")
          .delete()
          .eq("id", id);
        if (error) throw wrap("executive_metrics.remove", error);
      },
    },

    resourceLinks: {
      async list() {
        const { data, error } = await db()
          .from("resource_links")
          .select("*")
          .order("position", { ascending: true });
        if (error) {
          // The table arrives with a migration the office applies by
          // hand. Until then this is a setup state, not a fault: say so
          // and let every other part of the office carry on.
          if (MISSING_TABLE.has(error.code ?? "")) return { links: [], pending: true };
          throw wrap("resource_links.list", error);
        }
        return { links: data ?? [], pending: false };
      },
      async create(input: TablesInsert<"resource_links">) {
        const { data, error } = await db()
          .from("resource_links")
          .insert(input)
          .select("*")
          .single();
        return row("resource_links.create", data, error);
      },
      async update(id, input: TablesUpdate<"resource_links">) {
        const { data, error } = await db()
          .from("resource_links")
          .update(input)
          .eq("id", id)
          .select("*")
          .single();
        return row("resource_links.update", data, error);
      },
      async remove(id) {
        const { error } = await db().from("resource_links").delete().eq("id", id);
        if (error) throw wrap("resource_links.remove", error);
      },
    },
  };
}
