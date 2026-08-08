"use client";

import { useEffect, useState } from "react";
import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fdatetimeOrNull,
  fenum,
  fstr,
  isoToLocalInput,
  type FormValues,
} from "@/components/admin/form";
import type { NextAction, Project } from "@/lib/repositories";

const STATUSES = ["todo", "doing", "done"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;
const NO_PROJECT = "__none__";

const repos = () => getRepositories();
const load = () => repos().nextActions.list();

function fromForm(values: FormValues) {
  const projectId = fstr(values, "project_id");
  return {
    title: fstr(values, "title"),
    project_id: projectId === NO_PROJECT || projectId === "" ? null : projectId,
    due_at: fdatetimeOrNull(values, "due_at"),
    status: fenum(values, "status", STATUSES, "todo"),
    priority: fenum(values, "priority", PRIORITIES, "medium"),
  };
}

const onCreate = (values: FormValues) =>
  repos().nextActions.create(fromForm(values));
const onUpdate = (id: string, values: FormValues) =>
  repos().nextActions.update(id, fromForm(values));
const onRemove = (id: string) => repos().nextActions.remove(id);

const toForm = (row: NextAction | null): FormValues => ({
  title: row?.title ?? "",
  project_id: row?.project_id ?? NO_PROJECT,
  due_at: isoToLocalInput(row?.due_at ?? null),
  status: row?.status ?? "todo",
  priority: row?.priority ?? "medium",
});

const validate = (values: FormValues): string | null =>
  fstr(values, "title").trim() === "" ? "Title is required" : null;

export default function NextActionsAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    repos()
      .projects.list()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<NextAction>
        title="Next Actions"
        description="次のアクションの管理（projectに紐付け可能）"
        emptyLabel="No next actions yet"
        columns={[
          { key: "title", label: "TITLE", render: (r) => r.title },
          { key: "status", label: "STATUS", render: (r) => r.status },
          { key: "priority", label: "PRIORITY", render: (r) => r.priority },
          {
            key: "due",
            label: "DUE",
            render: (r) =>
              r.due_at ? new Date(r.due_at).toLocaleString() : "—",
          },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true },
          {
            name: "project_id",
            label: "Project",
            type: "select",
            options: [
              { value: NO_PROJECT, label: "(none)" },
              ...projects.map((p) => ({ value: p.id, label: p.title })),
            ],
          },
          { name: "due_at", label: "Due at", type: "datetime" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: PRIORITIES.map((p) => ({ value: p, label: p })),
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
