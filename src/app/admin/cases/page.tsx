"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fenum,
  fnum,
  fstr,
  urlFieldError,
  type FormValues,
} from "@/components/admin/form";
import type { CaseStudy } from "@/lib/repositories";

const SECTIONS = ["LOCAL", "SIGNAL", "PARTNER", "TABLE", "GREEN"] as const;

const repos = () => getRepositories();
const load = () => repos().caseStudies.list();

function fromForm(values: FormValues) {
  return {
    title: fstr(values, "title"),
    client_name: fstr(values, "client_name"),
    section_key: fenum(values, "section_key", SECTIONS, "SIGNAL"),
    summary: fstr(values, "summary"),
    result: fstr(values, "result"),
    thumbnail_url: fstr(values, "thumbnail_url").trim() || null,
    project_url: fstr(values, "project_url").trim() || null,
    is_public: fbool(values, "is_public"),
    display_order: fnum(values, "display_order"),
  };
}

const onCreate = (values: FormValues) =>
  repos().caseStudies.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().caseStudies.update(id, fromForm(values));
const onRemove = (id: string) => repos().caseStudies.remove(id);

const toForm = (row: CaseStudy | null): FormValues => ({
  title: row?.title ?? "",
  client_name: row?.client_name ?? "",
  section_key: row?.section_key ?? "SIGNAL",
  summary: row?.summary ?? "",
  result: row?.result ?? "",
  thumbnail_url: row?.thumbnail_url ?? "",
  project_url: row?.project_url ?? "",
  is_public: row?.is_public ?? false,
  display_order: row?.display_order ?? 100,
});

const validate = (values: FormValues): string | null => {
  if (fstr(values, "title").trim() === "") return "Title is required";
  return (
    urlFieldError(fstr(values, "thumbnail_url"), "Thumbnail URL") ??
    urlFieldError(fstr(values, "project_url"), "Project URL")
  );
};

export default function CasesAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<CaseStudy>
        title="Case Studies"
        description="事例・実績の管理（実案件のみ登録してください）"
        emptyLabel="No case studies yet"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          { key: "section", label: "SECTION", render: (r) => r.section_key },
          { key: "client", label: "CLIENT", render: (r) => r.client_name || "—" },
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
            name: "section_key",
            label: "Section",
            type: "select",
            options: SECTIONS.map((s) => ({ value: s, label: s })),
          },
          { name: "summary", label: "Summary", type: "textarea" },
          { name: "result", label: "Result", type: "textarea" },
          { name: "thumbnail_url", label: "Thumbnail URL", type: "text" },
          { name: "project_url", label: "Project URL", type: "text" },
          {
            name: "is_public",
            label: "Public",
            type: "checkbox",
            help: "guestにも公開する",
          },
          { name: "display_order", label: "Display order", type: "number" },
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
