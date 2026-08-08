"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fenum,
  fnum,
  fstr,
  type FormValues,
} from "@/components/admin/form";
import type { Profile } from "@/lib/repositories";

const ROLES = ["guest", "member", "admin"] as const;
const DEPARTMENTS = [
  "LOCAL",
  "SIGNAL",
  "PARTNER",
  "TABLE",
  "GREEN",
  "MANAGEMENT",
  "OTHER",
] as const;
const STATUSES = ["online", "away", "meeting", "offline"] as const;

const repos = () => getRepositories();
const load = () => repos().profiles.list();

const onUpdate = (id: string, values: FormValues) =>
  repos().profiles.update(id, {
    name: fstr(values, "name"),
    role: fenum(values, "role", ROLES, "guest"),
    position: fstr(values, "position"),
    department: fenum(values, "department", DEPARTMENTS, "OTHER"),
    status: fenum(values, "status", STATUSES, "offline"),
    bio: fstr(values, "bio"),
    today_schedule: fstr(values, "today_schedule"),
    is_public: fbool(values, "is_public"),
    display_order: fnum(values, "display_order"),
  });

const toForm = (row: Profile | null): FormValues => ({
  name: row?.name ?? "",
  role: row?.role ?? "guest",
  position: row?.position ?? "",
  department: row?.department ?? "OTHER",
  status: row?.status ?? "offline",
  bio: row?.bio ?? "",
  today_schedule: row?.today_schedule ?? "",
  is_public: row?.is_public ?? true,
  display_order: row?.display_order ?? 100,
});

export default function MembersAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<Profile>
        title="Members"
        description="profilesはSupabase Authと1:1です。社員の新規作成はAuth（招待/サインアップ）経由で行い、ここでは既存プロフィールの編集のみ行います。"
        emptyLabel="No profiles yet — profiles are created via Supabase Auth"
        createDisabledNote="社員作成はAuth経由（STEP 2.5）"
        columns={[
          { key: "name", label: "NAME", render: (r) => r.name },
          { key: "email", label: "EMAIL", render: (r) => r.email },
          { key: "role", label: "ROLE", render: (r) => r.role },
          { key: "department", label: "DEPT", render: (r) => r.department },
          { key: "status", label: "STATUS", render: (r) => r.status },
          {
            key: "public",
            label: "PUBLIC",
            render: (r) => (r.is_public ? "yes" : "no"),
          },
        ]}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "role",
            label: "Role",
            type: "select",
            options: ROLES.map((r) => ({ value: r, label: r })),
            help: "実DBでのrole変更はadmin RLSが必要（STEP 2.5で検証）",
          },
          { name: "position", label: "Position", type: "text" },
          {
            name: "department",
            label: "Department",
            type: "select",
            options: DEPARTMENTS.map((d) => ({ value: d, label: d })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          { name: "bio", label: "Bio", type: "textarea" },
          { name: "today_schedule", label: "Today's schedule", type: "text" },
          {
            name: "is_public",
            label: "Public",
            type: "checkbox",
            help: "guestにもプロフィールを表示",
          },
          { name: "display_order", label: "Display order", type: "number" },
        ]}
        load={load}
        toForm={toForm}
        onUpdate={onUpdate}
      />
    </div>
  );
}
