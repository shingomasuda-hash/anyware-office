"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fdateOrNull,
  fenum,
  fnum,
  fstr,
  type FormValues,
} from "@/components/admin/form";
import type { Project } from "@/lib/repositories";

const SECTIONS = ["LOCAL", "SIGNAL", "PARTNER", "TABLE", "GREEN"] as const;
const STATUSES = ["planning", "active", "review", "completed", "paused"] as const;

const repos = () => getRepositories();
const load = () => repos().projects.list();

function fromForm(values: FormValues) {
  return {
    title: fstr(values, "title"),
    client_name: fstr(values, "client_name"),
    business_section: fenum(values, "business_section", SECTIONS, "SIGNAL"),
    status: fenum(values, "status", STATUSES, "planning"),
    description: fstr(values, "description"),
    progress: Math.min(100, Math.max(0, fnum(values, "progress"))),
    due_date: fdateOrNull(values, "due_date"),
    amount: Math.max(0, fnum(values, "amount")),
    is_public: fbool(values, "is_public"),
  };
}

const onCreate = (values: FormValues) => repos().projects.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().projects.update(id, fromForm(values));
const onRemove = (id: string) => repos().projects.remove(id);

const toForm = (row: Project | null): FormValues => ({
  title: row?.title ?? "",
  client_name: row?.client_name ?? "",
  business_section: row?.business_section ?? "SIGNAL",
  status: row?.status ?? "planning",
  description: row?.description ?? "",
  progress: row?.progress ?? 0,
  due_date: row?.due_date ?? "",
  amount: row?.amount ?? 0,
  is_public: row?.is_public ?? false,
});

const validate = (values: FormValues): string | null =>
  fstr(values, "title").trim() === "" ? "Title is required" : null;

export default function ProjectsAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<Project>
        title="Projects"
        description="案件・プロジェクトの管理"
        emptyLabel="No projects yet"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          {
            key: "section",
            label: "SECTION",
            render: (r) => r.business_section,
          },
          { key: "status", label: "STATUS", render: (r) => r.status },
          {
            key: "progress",
            label: "PROGRESS",
            render: (r) => `${r.progress}%`,
          },
          {
            key: "public",
            label: "PUBLIC",
            render: (r) => (r.is_public ? "yes" : "no"),
          },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "client_name", label: "Client", type: "text" },
          {
            name: "business_section",
            label: "Business section",
            type: "select",
            options: SECTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          { name: "description", label: "Description", type: "textarea" },
          { name: "progress", label: "Progress (0-100)", type: "number" },
          { name: "due_date", label: "Due date", type: "date" },
          { name: "amount", label: "Amount (円)", type: "number" },
          {
            name: "is_public",
            label: "Public",
            type: "checkbox",
            help: "guestにも公開する",
          },
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
