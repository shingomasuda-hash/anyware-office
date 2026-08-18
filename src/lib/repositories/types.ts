import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

// Repository layer contract. UI components must depend on these
// interfaces only — never on supabase-js directly. The Supabase and
// Mock implementations return identical shapes (live DB row types).

export type DataSource = "SUPABASE" | "DEMO";

export type Profile = Tables<"profiles">;
export type BusinessSection = Tables<"business_sections">;
export type Announcement = Tables<"announcements">;
export type Project = Tables<"projects">;
export type SectionMetric = Tables<"section_metrics">;
export type CaseStudy = Tables<"case_studies">;
export type MeetingRoom = Tables<"meeting_rooms">;
export type Meeting = Tables<"meetings">;
export type NextAction = Tables<"next_actions">;
export type TableStoreMetric = Tables<"table_store_metrics">;
export type TableMenuItem = Tables<"table_menu_items">;
export type GreenDeal = Tables<"green_deals">;
export type LocalProject = Tables<"local_projects">;
export type ExecutiveMetric = Tables<"executive_metrics">;
export type ResourceLink = Tables<"resource_links">;

/**
 * Links live behind a migration the office may not have applied yet
 * (supabase/migrations/step5_agenda_links.sql). A missing table is a
 * SETUP state, not a failure: everything else on the page keeps
 * working and the desk says plainly what is not there yet.
 */
export interface ResourceLinkResult {
  links: ResourceLink[];
  /** true when the table does not exist yet */
  pending: boolean;
}

export interface CrudRepository<Row, Insert, Update> {
  list(): Promise<Row[]>;
  get(id: string): Promise<Row | null>;
  create(input: Insert): Promise<Row>;
  update(id: string, input: Update): Promise<Row>;
  remove(id: string): Promise<void>;
}

/** Profiles are created via Supabase Auth (handle_new_user), never directly. */
export interface ProfilesRepository {
  list(): Promise<Profile[]>;
  get(id: string): Promise<Profile | null>;
  update(id: string, input: TablesUpdate<"profiles">): Promise<Profile>;
}

export interface Repositories {
  source: DataSource;
  profiles: ProfilesRepository;
  businessSections: CrudRepository<
    BusinessSection,
    TablesInsert<"business_sections">,
    TablesUpdate<"business_sections">
  >;
  announcements: CrudRepository<
    Announcement,
    TablesInsert<"announcements">,
    TablesUpdate<"announcements">
  >;
  projects: CrudRepository<
    Project,
    TablesInsert<"projects">,
    TablesUpdate<"projects">
  >;
  sectionMetrics: CrudRepository<
    SectionMetric,
    TablesInsert<"section_metrics">,
    TablesUpdate<"section_metrics">
  >;
  caseStudies: CrudRepository<
    CaseStudy,
    TablesInsert<"case_studies">,
    TablesUpdate<"case_studies">
  >;
  meetingRooms: CrudRepository<
    MeetingRoom,
    TablesInsert<"meeting_rooms">,
    TablesUpdate<"meeting_rooms">
  >;
  meetings: CrudRepository<
    Meeting,
    TablesInsert<"meetings">,
    TablesUpdate<"meetings">
  >;
  nextActions: CrudRepository<
    NextAction,
    TablesInsert<"next_actions">,
    TablesUpdate<"next_actions">
  >;
  tableStoreMetrics: CrudRepository<
    TableStoreMetric,
    TablesInsert<"table_store_metrics">,
    TablesUpdate<"table_store_metrics">
  >;
  tableMenuItems: CrudRepository<
    TableMenuItem,
    TablesInsert<"table_menu_items">,
    TablesUpdate<"table_menu_items">
  >;
  greenDeals: CrudRepository<
    GreenDeal,
    TablesInsert<"green_deals">,
    TablesUpdate<"green_deals">
  >;
  localProjects: CrudRepository<
    LocalProject,
    TablesInsert<"local_projects">,
    TablesUpdate<"local_projects">
  >;
  executiveMetrics: CrudRepository<
    ExecutiveMetric,
    TablesInsert<"executive_metrics">,
    TablesUpdate<"executive_metrics">
  >;
  /**
   * Links to documents the office keeps elsewhere. `list` is tolerant
   * of the table not existing yet; the writes are not, because you can
   * only be adding a link if the table is already there.
   */
  resourceLinks: {
    list(): Promise<ResourceLinkResult>;
    create(input: TablesInsert<"resource_links">): Promise<ResourceLink>;
    update(id: string, input: TablesUpdate<"resource_links">): Promise<ResourceLink>;
    remove(id: string): Promise<void>;
  };
}
