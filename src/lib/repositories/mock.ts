import type { TablesInsert, TablesUpdate } from "@/types/database";
import { RepositoryError } from "./errors";
import {
  demoAnnouncements,
  demoBusinessSections,
  demoExecutiveMetrics,
  demoMeetingRooms,
  demoProfiles,
  demoSectionMetrics,
  demoTableStoreMetrics,
} from "./mockData";
import type {
  Announcement,
  BusinessSection,
  CaseStudy,
  CrudRepository,
  ExecutiveMetric,
  GreenDeal,
  LocalProject,
  Meeting,
  MeetingRoom,
  NextAction,
  Profile,
  Project,
  Repositories,
  ResourceLink,
  SectionMetric,
  TableMenuItem,
  TableStoreMetric,
} from "./types";

// In-memory DEMO repositories. CRUD works for UI verification but state
// lives only in this browser tab and is lost on reload — by design.

let seq = 0;

function demoId(prefix: string): string {
  seq += 1;
  return `demo-${prefix}-${seq}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

class InMemoryCrud<
  Row extends { id: string },
  Insert,
  Update extends Partial<Row>,
> implements CrudRepository<Row, Insert, Update>
{
  constructor(
    private rows: Row[],
    private materialize: (input: Insert) => Row,
  ) {}

  async list(): Promise<Row[]> {
    return [...this.rows];
  }

  async get(id: string): Promise<Row | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async create(input: Insert): Promise<Row> {
    const created = this.materialize(input);
    this.rows.unshift(created);
    return created;
  }

  async update(id: string, input: Update): Promise<Row> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index < 0) {
      throw new RepositoryError(`DEMO update failed: row ${id} not found`);
    }
    const next: Row = { ...this.rows[index], ...input, updated_at: nowIso() };
    this.rows[index] = next;
    return next;
  }

  async remove(id: string): Promise<void> {
    const index = this.rows.findIndex((r) => r.id === id);
    if (index < 0) {
      throw new RepositoryError(`DEMO remove failed: row ${id} not found`);
    }
    this.rows.splice(index, 1);
  }
}

export function createMockRepositories(): Repositories {
  const profiles = new InMemoryCrud<
    Profile,
    TablesInsert<"profiles">,
    TablesUpdate<"profiles">
  >([...demoProfiles], (input) => ({
    role: "guest",
    position: "",
    department: "OTHER",
    status: "offline",
    avatar_url: null,
    bio: "",
    today_schedule: "",
    is_public: true,
    display_order: 100,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const businessSections = new InMemoryCrud<
    BusinessSection,
    TablesInsert<"business_sections">,
    TablesUpdate<"business_sections">
  >([...demoBusinessSections], (input) => ({
    id: demoId("section"),
    tagline: "",
    description: "",
    display_order: 100,
    is_active: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const announcements = new InMemoryCrud<
    Announcement,
    TablesInsert<"announcements">,
    TablesUpdate<"announcements">
  >([...demoAnnouncements], (input) => ({
    id: demoId("announcement"),
    body: "",
    priority: "normal",
    visible_roles: ["guest", "member", "admin"],
    published_at: nowIso(),
    expires_at: null,
    created_by: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const projects = new InMemoryCrud<
    Project,
    TablesInsert<"projects">,
    TablesUpdate<"projects">
  >([], (input) => ({
    id: demoId("project"),
    client_name: "",
    status: "planning",
    description: "",
    assignee_id: null,
    progress: 0,
    due_date: null,
    amount: 0,
    is_public: false,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const sectionMetrics = new InMemoryCrud<
    SectionMetric,
    TablesInsert<"section_metrics">,
    TablesUpdate<"section_metrics">
  >([...demoSectionMetrics], (input) => ({
    id: demoId("metric"),
    value: "0",
    unit: "",
    comparison_value: null,
    comparison_label: null,
    display_order: 100,
    visible_roles: ["member", "admin"],
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const caseStudies = new InMemoryCrud<
    CaseStudy,
    TablesInsert<"case_studies">,
    TablesUpdate<"case_studies">
  >([], (input) => ({
    id: demoId("case"),
    client_name: "",
    summary: "",
    result: "",
    thumbnail_url: null,
    project_url: null,
    is_public: false,
    display_order: 100,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const meetingRooms = new InMemoryCrud<
    MeetingRoom,
    TablesInsert<"meeting_rooms">,
    TablesUpdate<"meeting_rooms">
  >([...demoMeetingRooms], (input) => ({
    id: demoId("room"),
    description: "",
    default_url: "",
    status: "available",
    visible_roles: ["member", "admin"],
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const meetings = new InMemoryCrud<
    Meeting,
    TablesInsert<"meetings">,
    TablesUpdate<"meetings">
  >([], (input) => ({
    id: demoId("meeting"),
    meeting_room_id: null,
    meeting_url: null,
    client_name: "",
    host_id: null,
    status: "scheduled",
    visible_roles: ["member", "admin"],
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const nextActions = new InMemoryCrud<
    NextAction,
    TablesInsert<"next_actions">,
    TablesUpdate<"next_actions">
  >([], (input) => ({
    id: demoId("action"),
    project_id: null,
    assignee_id: null,
    due_at: null,
    status: "todo",
    priority: "medium",
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const tableStoreMetrics = new InMemoryCrud<
    TableStoreMetric,
    TablesInsert<"table_store_metrics">,
    TablesUpdate<"table_store_metrics">
  >([...demoTableStoreMetrics], (input) => ({
    id: demoId("store-metric"),
    sales: 0,
    customers: 0,
    average_spend: 0,
    store_status: "open",
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const tableMenuItems = new InMemoryCrud<
    TableMenuItem,
    TablesInsert<"table_menu_items">,
    TablesUpdate<"table_menu_items">
  >([], (input) => ({
    id: demoId("menu"),
    category: "",
    price: 0,
    sales_count: 0,
    image_url: null,
    is_active: true,
    display_order: 100,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const greenDeals = new InMemoryCrud<
    GreenDeal,
    TablesInsert<"green_deals">,
    TablesUpdate<"green_deals">
  >([], (input) => ({
    id: demoId("deal"),
    deal_name: "",
    stage: "lead",
    amount: 0,
    probability: 0,
    next_action: "",
    assignee_id: null,
    expected_close_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const localProjects = new InMemoryCrud<
    LocalProject,
    TablesInsert<"local_projects">,
    TablesUpdate<"local_projects">
  >([], (input) => ({
    id: demoId("local"),
    area: "",
    partner: "",
    status: "active",
    summary: "",
    image_url: null,
    is_public: true,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const executiveMetrics = new InMemoryCrud<
    ExecutiveMetric,
    TablesInsert<"executive_metrics">,
    TablesUpdate<"executive_metrics">
  >([...demoExecutiveMetrics], (input) => ({
    id: demoId("exec"),
    value: 0,
    unit: "",
    period: "",
    comparison_value: null,
    created_at: nowIso(),
    updated_at: nowIso(),
    ...input,
  }));

  const resourceLinks = new InMemoryCrud<
    ResourceLink,
    TablesInsert<"resource_links">,
    TablesUpdate<"resource_links">
  >([], (input) => ({
    id: demoId("link"),
    kind: "sheet",
    section_id: null,
    project_id: null,
    meeting_id: null,
    position: 0,
    created_at: nowIso(),
    ...input,
  }));

  return {
    source: "DEMO",
    profiles: {
      list: () => profiles.list(),
      get: (id) => profiles.get(id),
      update: (id, input) => profiles.update(id, input),
    },
    businessSections,
    announcements,
    projects,
    sectionMetrics,
    caseStudies,
    meetingRooms,
    meetings,
    nextActions,
    tableStoreMetrics,
    tableMenuItems,
    greenDeals,
    localProjects,
    executiveMetrics,
    resourceLinks: {
      // The demo seed carries no fictional URLs, in line with every
      // other table here — an empty desk, not an invented one.
      list: async () => ({ links: await resourceLinks.list(), pending: false }),
      create: (input) => resourceLinks.create(input),
      update: (id, input) => resourceLinks.update(id, input),
      remove: (id) => resourceLinks.remove(id),
    },
  };
}
