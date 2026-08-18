"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDataSource } from "@/lib/repositories";
import SignOutButton from "./SignOutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/actions", label: "Next Actions" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/business", label: "Business" },
  { href: "/admin/cases", label: "Cases" },
  { href: "/admin/meetings", label: "Meetings" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/table", label: "TABLE" },
  { href: "/admin/green", label: "GREEN" },
  { href: "/admin/local", label: "LOCAL" },
  { href: "/admin/settings", label: "Settings" },
] as const;

function SourceBadge() {
  const demo = getDataSource() === "DEMO";
  return (
    <span
      data-testid="admin-data-source"
      className={`rounded px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] ${
        demo
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
      }`}
    >
      {demo ? "DEMO DATA" : "SUPABASE"}
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop sidebar */}
      <aside
        data-testid="admin-sidebar"
        className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-sm font-semibold tracking-tight">AnyWare OFFICE</p>
          <p className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400">
            ADMIN
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            data-testid="admin-drawer"
            className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-white shadow-xl dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <p className="text-sm font-semibold">AnyWare OFFICE ADMIN</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              data-testid="admin-menu-button"
              className="rounded-md border border-zinc-300 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M2 4h12M2 8h12M2 12h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h1 className="text-base font-semibold tracking-tight">
              ADMIN CONSOLE
            </h1>
            <span className="ml-auto flex items-center gap-2">
              <SourceBadge />
              <SignOutButton />
            </span>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
