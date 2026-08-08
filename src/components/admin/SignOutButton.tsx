"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/SessionProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function SignOutButton() {
  const router = useRouter();
  const user = useCurrentUser();

  if (!isSupabaseConfigured() || !user) return null;

  const handleSignOut = async () => {
    await getSupabaseClient().auth.signOut();
    // Replace so Back cannot restore a guarded page, then re-render
    // server components without the session.
    router.replace("/login");
    router.refresh();
  };

  return (
    <span className="flex items-center gap-2">
      <span className="hidden text-xs text-zinc-500 sm:inline">
        {user.name} ({user.role})
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        data-testid="admin-signout"
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </span>
  );
}
