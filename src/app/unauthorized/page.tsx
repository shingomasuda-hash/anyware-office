import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "403 — AnyWare OFFICE",
};

export default function UnauthorizedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-5xl font-semibold tabular-nums tracking-tight">403</p>
      <h1 className="text-lg font-semibold">
        You do not have permission to access this page.
      </h1>
      <p className="max-w-md text-sm leading-6 text-zinc-500">
        このページは管理者（admin）のみアクセスできます。
      </p>
      <Link
        href="/office"
        className="mt-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Back to OFFICE
      </Link>
    </main>
  );
}
