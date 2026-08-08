import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { toCurrentUser, type CurrentUser } from "./types";

/**
 * Server-side identity resolution:
 *
 *   verified JWT claims (getClaims) → auth user id → public.profiles → role
 *
 * The role always comes from the profiles table on the server — never
 * from anything the client sent. Returns null for anonymous visitors
 * (guests are first-class in AnyWare OFFICE).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !data?.claims?.sub) return null;
  const userId = data.claims.sub;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Configured Supabase failing is an error — never silently degrade.
    throw new Error(`Failed to load profile for auth user: ${error.message}`);
  }
  if (!profile) {
    // Auth user without a profile row (handle_new_user should prevent
    // this). Treated as unauthenticated: such users get guest visibility
    // and are rejected by the admin guard.
    console.warn("Auth user has no profiles row; treating as anonymous");
    return null;
  }
  return toCurrentUser(profile);
}
