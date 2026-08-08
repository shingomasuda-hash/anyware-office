"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/SessionProvider";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configured = isSupabaseConfigured();
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setError(signInError?.message ?? "Sign in failed");
        return;
      }
      // Destination by profile role (server re-verifies on /admin).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      const fallback = profile?.role === "admin" ? "/admin" : "/office";
      const target = nextPath ?? fallback;
      router.replace(target);
      // Re-render server components with the new cookie session.
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    router.refresh();
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-medium tracking-[0.3em] text-zinc-500">
          ANYWARE OFFICE
        </p>
        <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight">
          LOGIN
        </h1>

        {!configured ? (
          <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-xs leading-5 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
            DEMO MODE — Supabaseが未設定のためログインは利用できません。
            <br />
            <Link href="/office" className="underline">
              guestとしてOfficeへ
            </Link>
          </p>
        ) : currentUser ? (
          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as{" "}
              <span className="font-medium">{currentUser.name}</span> (
              {currentUser.role})
            </p>
            <div className="flex justify-center gap-2">
              <Link
                href={currentUser.role === "admin" ? "/admin" : "/office"}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Continue
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                data-testid="signout-button"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-[11px] font-semibold tracking-wider text-zinc-500"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-[11px] font-semibold tracking-wider text-zinc-500"
              >
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            {error ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                role="alert"
                data-testid="login-error"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              data-testid="login-submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
            <p className="text-center text-xs text-zinc-400">
              ログインせず
              <Link href="/office" className="underline">
                guestとして見学
              </Link>
              することもできます
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginForm() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
