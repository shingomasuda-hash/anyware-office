import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  isSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./env";

/**
 * Server Supabase client for Server Components, Server Actions, and
 * Route Handlers. Reads the auth session from request cookies.
 *
 * Server Components cannot write cookies — those setAll calls are
 * swallowed here by design; session refresh happens in proxy.ts
 * (src/lib/supabase/proxy.ts) which CAN write response cookies.
 */
export async function getSupabaseServerClient(): Promise<
  SupabaseClient<Database>
> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing).",
    );
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — safe to ignore because the
          // proxy refreshes sessions on every matched request.
        }
      },
    },
  });
}
