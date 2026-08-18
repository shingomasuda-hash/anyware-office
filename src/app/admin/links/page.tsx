"use client";

import { useEffect, useState } from "react";
import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { fenum, fnum, fstr, urlFieldError, type FormValues } from "@/components/admin/form";
import type {
  BusinessSection,
  Meeting,
  Project,
  ResourceLink,
} from "@/lib/repositories";

/**
 * Links to the documents the office actually works in — spreadsheets,
 * folders, forms. A link belongs to exactly one thing (a section, a
 * project or a meeting), which the database enforces, so the form asks
 * for one owner rather than three nullable ids.
 */

const KINDS = ["sheet", "doc", "folder", "form", "other"] as const;

const repos = () => getRepositories();
const load = () => repos().resourceLinks.list().then((r) => r.links);

/** "project:<id>" — one field instead of three mutually exclusive ones. */
function ownerColumns(owner: string) {
  const [type, id] = owner.split(":");
  return {
    section_id: type === "section" ? id : null,
    project_id: type === "project" ? id : null,
    meeting_id: type === "meeting" ? id : null,
  };
}
function ownerValue(row: ResourceLink | null): string {
  if (row?.section_id) return `section:${row.section_id}`;
  if (row?.project_id) return `project:${row.project_id}`;
  if (row?.meeting_id) return `meeting:${row.meeting_id}`;
  return "";
}

export default function LinksAdminPage() {
  const [sections, setSections] = useState<BusinessSection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    repos().businessSections.list().then(setSections).catch(() => setSections([]));
    repos().projects.list().then(setProjects).catch(() => setProjects([]));
    repos().meetings.list().then(setMeetings).catch(() => setMeetings([]));
    repos()
      .resourceLinks.list()
      .then((r) => setSetupNeeded(r.pending))
      .catch(() => setSetupNeeded(false));
  }, []);

  const owners = [
    ...sections.map((s) => ({ value: `section:${s.id}`, label: `SECTION · ${s.title}` })),
    ...projects.map((p) => ({ value: `project:${p.id}`, label: `PROJECT · ${p.title}` })),
    ...meetings.map((m) => ({ value: `meeting:${m.id}`, label: `MEETING · ${m.title}` })),
  ];

  const fromForm = (values: FormValues) => ({
    label: fstr(values, "label"),
    url: fstr(values, "url").trim(),
    kind: fenum(values, "kind", KINDS, "sheet"),
    position: fnum(values, "position"),
    ...ownerColumns(fstr(values, "owner")),
  });

  const validate = (values: FormValues): string | null => {
    if (fstr(values, "label").trim() === "") return "Label is required";
    if (fstr(values, "owner") === "") return "所属（Section / Project / Meeting）を選んでください";
    const url = fstr(values, "url").trim();
    if (!url.startsWith("https://")) return "URL は https:// で始まる必要があります（DB制約）";
    return urlFieldError(url, "URL");
  };

  const ownerLabel = (r: ResourceLink) =>
    owners.find((o) => o.value === ownerValue(r))?.label ?? "—";

  return (
    <div className="mx-auto max-w-5xl">
      {setupNeeded ? (
        <p className="mb-4 rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <code>resource_links</code> テーブルがまだありません。
          <code className="mx-1">supabase/migrations/step5_agenda_links.sql</code>
          を Supabase の SQL Editor で適用してください。適用するまで保存はできません。
        </p>
      ) : null}
      <ResourceManager<ResourceLink>
        title="Links"
        description="スプレッドシートやフォルダへのリンク。Office で席に座ると、この一覧がデスクに並びます。https:// のみ有効です。"
        emptyLabel="No links yet"
        columns={[
          { key: "label", label: "LABEL", render: (r) => r.label },
          { key: "kind", label: "KIND", render: (r) => r.kind },
          { key: "owner", label: "ATTACHED TO", render: ownerLabel },
          { key: "url", label: "URL", render: (r) => r.url },
        ]}
        fields={[
          { name: "label", label: "Label", type: "text", required: true },
          {
            name: "url",
            label: "URL",
            type: "text",
            required: true,
            help: "https:// のみ（Google スプレッドシートの共有URLなど）",
          },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            options: KINDS.map((k) => ({ value: k, label: k })),
          },
          {
            name: "owner",
            label: "Attached to",
            type: "select",
            options: [{ value: "", label: "(select one)" }, ...owners],
            help: "Section / Project / Meeting のいずれか一つに紐づきます",
          },
          { name: "position", label: "Position", type: "number" },
        ]}
        load={load}
        toForm={(row: ResourceLink | null): FormValues => ({
          label: row?.label ?? "",
          url: row?.url ?? "",
          kind: row?.kind ?? "sheet",
          owner: ownerValue(row),
          position: row?.position ?? 0,
        })}
        validate={validate}
        onCreate={(values) => repos().resourceLinks.create(fromForm(values))}
        onUpdate={(id, values) => repos().resourceLinks.update(id, fromForm(values))}
        onRemove={(id) => repos().resourceLinks.remove(id)}
      />
    </div>
  );
}
