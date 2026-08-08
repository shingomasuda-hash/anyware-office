import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ConfigurationError from "@/components/system/ConfigurationError";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "AnyWare OFFICE ADMIN",
};

/**
 * Server-side admin guard. The console HTML is never rendered for
 * non-admins:
 *
 *   unauthenticated        → /login?next=/admin
 *   guest / member profile → /unauthorized
 *   admin                  → console
 *
 * The proxy already bounces unauthenticated /admin requests optimistically;
 * this layout is the authoritative check (verified JWT → profiles.role).
 * Development without Supabase config keeps the STEP 2 DEMO console.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return <ConfigurationError />;
    }
    return <AdminShell>{children}</AdminShell>;
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (user.role !== "admin") {
    redirect("/unauthorized");
  }
  return <AdminShell>{children}</AdminShell>;
}
