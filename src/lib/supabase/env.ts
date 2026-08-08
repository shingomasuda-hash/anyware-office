// Supabase environment layer.
//
// NEXT_PUBLIC_* variables are inlined at build time, so they must be
// referenced statically. The publishable key is safe for browsers by
// design, but still never log it in full. service_role / secret keys
// must never appear anywhere in this codebase.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  // Legacy variable name kept for compatibility with older env files.
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
}

/** e.g. "fcwrqjnukiwzgjutcdds" from https://<ref>.supabase.co — null if unset/invalid. */
export function supabaseProjectRef(): string | null {
  const match = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(SUPABASE_URL);
  return match ? match[1] : null;
}
