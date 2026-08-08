import type { Visibility } from "@/types/office";

// STEP 1 mock data. In STEP 2 this module is replaced by the repository
// layer (src/lib/repositories) backed by Supabase, keeping the same shapes.

export interface MockMetric {
  label: string;
  value: string;
  visibility: Visibility;
}

export interface MockStaffMember {
  id: string;
  name: string;
  department: string;
  status: string;
}

export interface MockMeetingRoom {
  id: string;
  name: string;
  capacity: number;
  /** Per-meeting URL (STEP 2: meetings.meeting_url). Empty in STEP 1. */
  meetingUrl: string;
  /** Room fallback URL (STEP 2: meeting_rooms.default_url). Empty in STEP 1. */
  defaultUrl: string;
}

export const entranceContent = {
  title: "AnyWare OFFICE",
  welcome: "Welcome to AnyWare",
  announcements: [
    "AnyWare OFFICEへようこそ",
    "各エリアを自由に見て回ることができます。",
  ],
  mission: "世の中をアップデートする。",
  vision: "“経済圏”にうねりを与え、育てる。",
  values: ["余白を、遊び場に。", "常識を、編集する。"],
} as const;

// Demo placeholders only — real profiles arrive from Supabase in STEP 2.5.
export const staffMembers: MockStaffMember[] = [
  { id: "demo-a", name: "Member A", department: "SIGNAL", status: "ONLINE" },
  { id: "demo-b", name: "Member B", department: "TABLE", status: "AWAY" },
  { id: "demo-c", name: "Member C", department: "MANAGEMENT", status: "ONLINE" },
];

export const signalContent = {
  description: "企業の魅力を、届く形に変える。",
  metrics: [
    { label: "進行中案件", value: "0", visibility: "member" },
    { label: "制作中コンテンツ", value: "0", visibility: "member" },
    { label: "広告運用", value: "0", visibility: "member" },
  ] satisfies MockMetric[],
};

export const partnerContent = {
  description: "企業の隣で、事業を動かす。",
  metrics: [
    { label: "Active Clients", value: "0", visibility: "member" },
    { label: "Meetings", value: "0", visibility: "member" },
    { label: "Projects", value: "0", visibility: "member" },
  ] satisfies MockMetric[],
};

export const tableContent = {
  description: "場所と食から、新しい体験をつくる。",
  storeName: "なら和ポケ日和",
  metrics: [
    { label: "Today's Sales", value: "0", visibility: "member" },
    { label: "Customers", value: "0", visibility: "member" },
  ] satisfies MockMetric[],
};

export const greenContent = {
  description: "テクノロジーで、育て方をアップデートする。",
  metrics: [
    { label: "Demo Units", value: "0", visibility: "member" },
    { label: "Sales Pipeline", value: "0", visibility: "member" },
    { label: "Projects", value: "0", visibility: "member" },
  ] satisfies MockMetric[],
};

export const localContent = {
  description: "地域の余白から、新しい価値をつくる。",
  metrics: [
    { label: "Projects", value: "0", visibility: "member" },
    { label: "Partners", value: "0", visibility: "member" },
  ] satisfies MockMetric[],
};

export const meetingRooms: MockMeetingRoom[] = [
  { id: "room-a", name: "商談ルーム A", capacity: 6, meetingUrl: "", defaultUrl: "" },
  { id: "room-b", name: "社内MTGルーム", capacity: 10, meetingUrl: "", defaultUrl: "" },
  { id: "room-c", name: "経営会議ルーム", capacity: 8, meetingUrl: "", defaultUrl: "" },
];

export const aiContent = {
  title: "AI / DX LAB",
  status: "COMING SOON",
  topics: ["AI活用", "業務効率化", "Automation", "Knowledge"],
};

export const adminContent = {
  title: "ADMIN",
  notice: "ADMIN CONSOLE",
  availability: "AVAILABLE IN STEP 2.5",
};
