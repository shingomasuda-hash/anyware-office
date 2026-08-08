"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRepositories,
  repositoryErrorMessage,
  type Announcement,
  type BusinessSection,
  type ExecutiveMetric,
  type NextAction,
  type Project,
  type SectionMetric,
} from "@/lib/repositories";
import { isSupabaseConfigured, supabaseProjectRef } from "@/lib/supabase/env";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/states";

interface DashboardData {
  executiveMetrics: ExecutiveMetric[];
  sections: BusinessSection[];
  sectionMetrics: SectionMetric[];
  announcements: Announcement[];
  projects: Project[];
  nextActions: NextAction[];
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AdminDashboardPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  const reload = useCallback(() => {
    const repos = getRepositories();
    setState({ status: "loading" });
    Promise.all([
      repos.executiveMetrics.list(),
      repos.businessSections.list(),
      repos.sectionMetrics.list(),
      repos.announcements.list(),
      repos.projects.list(),
      repos.nextActions.list(),
    ])
      .then(
        ([
          executiveMetrics,
          sections,
          sectionMetrics,
          announcements,
          projects,
          nextActions,
        ]) =>
          setState({
            status: "ready",
            data: {
              executiveMetrics,
              sections,
              sectionMetrics,
              announcements,
              projects,
              nextActions,
            },
          }),
      )
      .catch((error: unknown) =>
        setState({ status: "error", message: repositoryErrorMessage(error) }),
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const source = getRepositories().source;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mb-6 text-xs text-zinc-500">
        AnyWare OFFICE data overview
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="DATA SOURCE">
          <p className="text-2xl font-semibold">{source}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {source === "SUPABASE"
              ? `Project ref: ${supabaseProjectRef() ?? "unknown"}`
              : "In-memory demo data — changes are lost on reload"}
          </p>
        </Card>
        <Card title="SYSTEM STATUS">
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span className="text-zinc-500">Supabase env</span>
              <span className="font-medium">
                {isSupabaseConfigured() ? "CONFIGURED" : "NOT CONFIGURED"}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-500">Auth guard</span>
              <span className="font-medium text-amber-600">STEP 2.5</span>
            </li>
            <li className="flex justify-between">
              <span className="text-zinc-500">Realtime</span>
              <span className="font-medium text-zinc-400">STEP 3</span>
            </li>
          </ul>
        </Card>
      </div>

      {state.status === "loading" ? (
        <LoadingState />
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={reload} />
      ) : (
        <>
          <div className="mb-6">
            <Card title="EXECUTIVE METRICS">
              {state.data.executiveMetrics.length === 0 ? (
                <EmptyState label="No executive metrics" />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {state.data.executiveMetrics.map((m) => (
                    <div key={m.id}>
                      <p className="truncate text-[11px] text-zinc-500" title={m.label}>
                        {m.label}
                      </p>
                      <p className="text-xl font-semibold tabular-nums">
                        {m.value.toLocaleString()}
                        {m.unit ? (
                          <span className="ml-0.5 text-xs font-normal text-zinc-500">
                            {m.unit}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="BUSINESS OVERVIEW">
              <ul className="space-y-2">
                {state.data.sections.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-zinc-500">{s.description}</p>
                    </div>
                    <span className="text-xs tabular-nums text-zinc-400">
                      {
                        state.data.sectionMetrics.filter(
                          (m) => m.section_key === s.section_key,
                        ).length
                      }{" "}
                      KPI
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="RECENT ANNOUNCEMENTS">
              {state.data.announcements.length === 0 ? (
                <EmptyState label="No announcements" />
              ) : (
                <ul className="space-y-2">
                  {state.data.announcements.slice(0, 4).map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(a.published_at).toLocaleDateString()} ·{" "}
                        {a.priority}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="PROJECTS">
              <p className="text-2xl font-semibold tabular-nums">
                {state.data.projects.length}
              </p>
              {state.data.projects.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  No projects yet — create one in Projects
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {state.data.projects.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span className="truncate">{p.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-zinc-400">
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="NEXT ACTIONS">
              <p className="text-2xl font-semibold tabular-nums">
                {state.data.nextActions.length}
              </p>
              {state.data.nextActions.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  No next actions yet — create one in Next Actions
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {state.data.nextActions.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="truncate">{a.title}</span>
                      <span className="ml-2 shrink-0 text-xs text-zinc-400">
                        {a.status} / {a.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
