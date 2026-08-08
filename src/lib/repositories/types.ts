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
}
