"use client";

import { useEffect, useRef } from "react";
import type { DemoRole, OfficeArea, Visibility } from "@/types/office";
import type { MockMetric } from "@/data/mockOfficeData";
import { canView } from "@/lib/auth/visibility";

// PanelKit — the shared shell + building blocks every area panel is
// composed from. STEP 2 swaps the mock content for repository data
// without touching this shell.

export function PanelShell({
  area,
  onClose,
  children,
}: {
  area: OfficeArea;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${area.label} panel`}
        data-testid="area-panel"
        className="absolute flex flex-col bg-white text-zinc-900 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[75dvh] max-md:rounded-t-2xl max-md:animate-sheet-up md:right-0 md:top-0 md:h-full md:w-[420px] md:animate-drawer-in"
      >
        <div className="h-1.5 shrink-0" style={{ background: area.accent }} />
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {area.label}
            </h2>
            <p className="mt-0.5 text-[11px] font-medium tracking-[0.15em] text-zinc-500">
              {area.subtitle}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            data-testid="panel-close"
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-2 focus:outline-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </section>
    </div>
  );
}

export function PanelSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      {title ? (
        <h3 className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-zinc-500">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function PanelSummary({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
      {children}
    </p>
  );
}

export function DemoBadge({ label = "DEMO DATA" }: { label?: string }) {
  return (
    <span className="inline-block rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
      {label}
    </span>
  );
}

function LockedCard({ needs }: { needs: Visibility }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-center dark:border-zinc-700">
      <p className="text-[10px] font-semibold tracking-wider text-zinc-400">
        {needs.toUpperCase()} ONLY
      </p>
      <p className="mt-1 text-[10px] text-zinc-400">Sign in — STEP 2.5</p>
    </div>
  );
}

export function MetricGrid({
  metrics,
  role,
}: {
  metrics: MockMetric[];
  role: DemoRole;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {metrics.map((m) =>
        canView(role, m.visibility) ? (
          <div
            key={m.label}
            className="rounded-lg border border-zinc-200 px-3 py-3 dark:border-zinc-800"
          >
            <p className="truncate text-[11px] text-zinc-500" title={m.label}>
              {m.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {m.value}
            </p>
          </div>
        ) : (
          <LockedCard key={m.label} needs={m.visibility} />
        ),
      )}
    </div>
  );
}

export function PanelList({
  items,
}: {
  items: Array<{ key: string; primary: React.ReactNode; secondary?: React.ReactNode; trailing?: React.ReactNode }>;
}) {
  return (
    <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{item.primary}</div>
            {item.secondary ? (
              <div className="mt-0.5 text-xs text-zinc-500">
                {item.secondary}
              </div>
            ) : null}
          </div>
          {item.trailing ? <div className="shrink-0">{item.trailing}</div> : null}
        </li>
      ))}
    </ul>
  );
}

export function CtaArea({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 flex flex-col gap-2">{children}</div>;
}

/**
 * Meeting-style CTA: renders an enabled external link only for a valid
 * http(s) URL; otherwise a disabled button with a note. Prevents empty
 * hrefs from reloading the current page.
 */
export function UrlCtaButton({
  label,
  url,
  emptyNote,
}: {
  label: string;
  url: string;
  emptyNote: string;
}) {
  const trimmed = url.trim();
  const valid = /^https?:\/\//i.test(trimmed);
  if (valid) {
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {label}
      </a>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
      >
        {label}
      </button>
      <p className="text-[11px] text-zinc-400">{emptyNote}</p>
    </div>
  );
}
