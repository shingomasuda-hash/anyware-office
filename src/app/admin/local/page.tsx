"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fenum,
  fstr,
  urlFieldError,
  type FormValues,
} from "@/components/admin/form";
import type { LocalProject } from "@/lib/repositories";

const STATUSES = ["planning", "active", "completed"] as const;

const repos = () => getRepositories();
const load = () => repos().localProjects.list();

function fromForm(values: FormValues) {
  return {
    title: fstr(values, "title"),
    area: fstr(values, "area"),
    partner: fstr(values, "partner"),
    status: fenum(values, "status", STATUSES, "active"),
    summary: fstr(values, "summary"),
    image_url: fstr(values, "image_url").trim() || null,
    is_public: fbool(values, "is_public"),
  };
}

const onCreate = (values: FormValues) =>
  repos().localProjects.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().localProjects.update(id, fromForm(values));
const onRemove = (id: string) => repos().localProjects.remove(id);

const toForm = (row: LocalProject | null): FormValues => ({
  title: row?.title ?? "",
  area: row?.area ?? "",
  partner: row?.partner ?? "",
  status: row?.status ?? "active",
  summary: row?.summary ?? "",
  image_url: row?.image_url ?? "",
  is_public: row?.is_public ?? true,
});

const validate = (values: FormValues): string | null => {
  if (fstr(values, "title").trim() === "") return "Title is required";
  return urlFieldError(fstr(values, "image_url"), "Image URL");
};

export default function LocalAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<LocalProject>
        title="LOCAL Projects"
        description="地域創生プロジェクトの管理（実案件のみ登録してください）"
        emptyLabel="No local projects — 0件からスタート"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          { key: "area", label: "AREA", render: (r) => r.area || "—" },
          { key: "partner", label: "PARTNER", render: (r) => r.partner || "—" },
          { key: "status", label: "STATUS", render: (r) => r.status },
          {
            key: "public",
            label: "PUBLIC",
            render: (r) => (r.is_public ? "yes" : "no"),
          },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          { name: "area", label: "Area", type: "text" },
          { name: "partner", label: "Partner", type: "text" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          { name: "summary", label: "Summary", type: "textarea" },
          { name: "image_url", label: "Image URL", type: "text" },
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
