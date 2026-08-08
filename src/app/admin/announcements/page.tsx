"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fdatetimeOrNull,
  fenum,
  froles,
  fstr,
  isoToLocalInput,
  type FormValues,
} from "@/components/admin/form";
import type { Announcement } from "@/lib/repositories";

const PRIORITIES = ["normal", "important", "urgent"] as const;

// Module-scope adapters keep function identities stable across renders.
const repos = () => getRepositories();
const load = () => repos().announcements.list();

function fromForm(values: FormValues) {
  return {
    title: fstr(values, "title"),
    body: fstr(values, "body"),
    priority: fenum(values, "priority", PRIORITIES, "normal"),
    visible_roles: froles(values, "visible_roles"),
    published_at: fdatetimeOrNull(values, "published_at") ?? undefined,
    expires_at: fdatetimeOrNull(values, "expires_at"),
  };
}

const onCreate = (values: FormValues) =>
  repos().announcements.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().announcements.update(id, fromForm(values));
const onRemove = (id: string) => repos().announcements.remove(id);

const toForm = (row: Announcement | null): FormValues => ({
  title: row?.title ?? "",
  body: row?.body ?? "",
  priority: row?.priority ?? "normal",
  visible_roles: row?.visible_roles ?? ["guest", "member", "admin"],
  published_at: isoToLocalInput(row?.published_at ?? new Date().toISOString()),
  expires_at: isoToLocalInput(row?.expires_at ?? null),
});

const validate = (values: FormValues): string | null => {
  if (fstr(values, "title").trim() === "") return "Title is required";
  if (froles(values, "visible_roles").length === 0)
    return "少なくとも1つのroleを選択してください";
  return null;
};

export default function AnnouncementsAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<Announcement>
        title="Announcements"
        description="お知らせの管理（visible_rolesで表示対象を制御）"
        emptyLabel="No announcements yet"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          { key: "priority", label: "PRIORITY", render: (r) => r.priority },
          {
            key: "roles",
            label: "VISIBLE",
            render: (r) => r.visible_roles.join(", "),
          },
          {
            key: "published",
            label: "PUBLISHED",
            render: (r) => new Date(r.published_at).toLocaleString(),
          },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "body", label: "Body", type: "textarea" },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: PRIORITIES.map((p) => ({ value: p, label: p })),
          },
          { name: "visible_roles", label: "Visible roles", type: "roles" },
          { name: "published_at", label: "Published at", type: "datetime" },
          { name: "expires_at", label: "Expires at", type: "datetime" },
        ]}
        load={load}
        toForm={toForm}
        validate={validate}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    </div>
  );
}
