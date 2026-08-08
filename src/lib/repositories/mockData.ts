import type {
  Announcement,
  BusinessSection,
  ExecutiveMetric,
  MeetingRoom,
  Profile,
  SectionMetric,
  TableStoreMetric,
} from "./types";

// DEMO seed for the mock repositories. Mirrors the production
// seed_production_safe state: same tables, same row counts, KPI values at
// 0, meeting URLs empty, no fictional clients/deals/revenue. Profile rows
// are obvious placeholders (real profiles come from Supabase Auth).

const NOW = "2026-08-08T00:00:00.000Z";

const stamps = { created_at: NOW, updated_at: NOW } as const;

export const demoBusinessSections: BusinessSection[] = [
  {
    id: "demo-section-local",
    section_key: "LOCAL",
    title: "LOCAL",
    tagline: "地域の余白から、新しい価値をつくる。",
    description: "地域創生",
    display_order: 10,
    is_active: true,
    ...stamps,
  },
  {
    id: "demo-section-signal",
    section_key: "SIGNAL",
    title: "SIGNAL",
    tagline: "企業の魅力を、届く形に変える。",
    description: "マーケティング / SNS / 広告 / 採用 / Web",
    display_order: 20,
    is_active: true,
    ...stamps,
  },
  {
    id: "demo-section-partner",
    section_key: "PARTNER",
    title: "PARTNER",
    tagline: "企業の隣で、事業を動かす。",
    description: "企業支援 / 営業 / アライアンス",
    display_order: 30,
    is_active: true,
    ...stamps,
  },
  {
    id: "demo-section-table",
    section_key: "TABLE",
    title: "TABLE",
    tagline: "場所と食から、新しい体験をつくる。",
    description: "飲食事業",
    display_order: 40,
    is_active: true,
    ...stamps,
  },
  {
    id: "demo-section-green",
    section_key: "GREEN",
    title: "GREEN",
    tagline: "テクノロジーで、育て方をアップデートする。",
    description: "水耕栽培 / 農業",
    display_order: 50,
    is_active: true,
    ...stamps,
  },
];

const MEMBER_ROLES = ["member", "admin"] as const;

function metric(
  section: SectionMetric["section_key"],
  metricKey: string,
  label: string,
  order: number,
): SectionMetric {
  return {
    id: `demo-metric-${section.toLowerCase()}-${metricKey}`,
    section_key: section,
    metric_key: metricKey,
    label,
    value: "0",
    unit: "",
    comparison_value: null,
    comparison_label: null,
    display_order: order,
    visible_roles: [...MEMBER_ROLES],
    ...stamps,
  };
}

// 13 metrics, matching the production seed (SIGNAL 3 / PARTNER 3 /
// TABLE 2 / GREEN 3 / LOCAL 2).
export const demoSectionMetrics: SectionMetric[] = [
  metric("SIGNAL", "active_cases", "進行中案件", 10),
  metric("SIGNAL", "producing_contents", "制作中コンテンツ", 20),
  metric("SIGNAL", "ad_operations", "広告運用", 30),
  metric("PARTNER", "active_clients", "Active Clients", 10),
  metric("PARTNER", "meetings", "Meetings", 20),
  metric("PARTNER", "projects", "Projects", 30),
  metric("TABLE", "today_sales", "Today's Sales", 10),
  metric("TABLE", "customers", "Customers", 20),
  metric("GREEN", "demo_units", "Demo Units", 10),
  metric("GREEN", "sales_pipeline", "Sales Pipeline", 20),
  metric("GREEN", "projects", "Projects", 30),
  metric("LOCAL", "projects", "Projects", 10),
  metric("LOCAL", "partners", "Partners", 20),
];

export const demoAnnouncements: Announcement[] = [
  {
    id: "demo-announcement-1",
    title: "AnyWare OFFICE の運用を開始しました",
    body: "各エリアを自由に見て回ることができます。",
    priority: "normal",
    visible_roles: ["guest", "member", "admin"],
    published_at: NOW,
    expires_at: null,
    created_by: null,
    ...stamps,
  },
  {
    id: "demo-announcement-2",
    title: "AnyWare OFFICEへようこそ",
    body: "ここは株式会社AnyWareのバーチャルオフィスです。",
    priority: "normal",
    visible_roles: ["guest", "member", "admin"],
    published_at: NOW,
    expires_at: null,
    created_by: null,
    ...stamps,
  },
];

export const demoMeetingRooms: MeetingRoom[] = [
  {
    id: "demo-room-a",
    name: "商談ルーム A",
    description: "クライアント商談用",
    default_url: "",
    status: "available",
    visible_roles: [...MEMBER_ROLES],
    ...stamps,
  },
  {
    id: "demo-room-b",
    name: "社内MTGルーム",
    description: "社内ミーティング用",
    default_url: "",
    status: "available",
    visible_roles: [...MEMBER_ROLES],
    ...stamps,
  },
  {
    id: "demo-room-c",
    name: "経営会議ルーム",
    description: "経営会議用",
    default_url: "",
    status: "available",
    visible_roles: [...MEMBER_ROLES],
    ...stamps,
  },
];

export const demoExecutiveMetrics: ExecutiveMetric[] = [
  { id: "demo-exec-revenue", metric_key: "revenue", label: "Revenue", value: 0, unit: "円", period: "", comparison_value: null, ...stamps },
  { id: "demo-exec-gross-profit", metric_key: "gross_profit", label: "Gross Profit", value: 0, unit: "円", period: "", comparison_value: null, ...stamps },
  { id: "demo-exec-active-projects", metric_key: "active_projects", label: "Active Projects", value: 0, unit: "件", period: "", comparison_value: null, ...stamps },
  { id: "demo-exec-pipeline", metric_key: "pipeline", label: "Pipeline", value: 0, unit: "円", period: "", comparison_value: null, ...stamps },
  { id: "demo-exec-meetings", metric_key: "meetings", label: "Meetings", value: 0, unit: "件", period: "", comparison_value: null, ...stamps },
  { id: "demo-exec-online-members", metric_key: "online_members", label: "Online Members", value: 0, unit: "人", period: "", comparison_value: null, ...stamps },
];

export const demoTableStoreMetrics: TableStoreMetric[] = [
  {
    id: "demo-store-metric-1",
    store_name: "なら和ポケ日和",
    business_date: "2026-08-08",
    sales: 0,
    customers: 0,
    average_spend: 0,
    store_status: "open",
    ...stamps,
  },
];

// Obvious placeholders — real people arrive via Supabase Auth in STEP 2.5.
export const demoProfiles: Profile[] = [
  {
    id: "demo-profile-a",
    name: "Member A",
    email: "member-a@demo.invalid",
    role: "member",
    position: "DEMO",
    department: "SIGNAL",
    status: "online",
    avatar_url: null,
    bio: "",
    today_schedule: "",
    is_public: true,
    display_order: 10,
    ...stamps,
  },
  {
    id: "demo-profile-b",
    name: "Member B",
    email: "member-b@demo.invalid",
    role: "member",
    position: "DEMO",
    department: "TABLE",
    status: "away",
    avatar_url: null,
    bio: "",
    today_schedule: "",
    is_public: true,
    display_order: 20,
    ...stamps,
  },
  {
    id: "demo-profile-c",
    name: "Member C",
    email: "member-c@demo.invalid",
    role: "admin",
    position: "DEMO",
    department: "MANAGEMENT",
    status: "online",
    avatar_url: null,
    bio: "",
    today_schedule: "",
    is_public: true,
    display_order: 30,
    ...stamps,
  },
];
