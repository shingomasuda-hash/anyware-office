import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import {
  isSupabaseConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./env";

/**
 * Proxy-side session handling (Next.js 16 proxy.ts — the middleware
 * successor). Responsibilities:
 *
 * 1. Refresh the Supabase auth session on every matched request and keep
 *    request + response cookies in sync.
 * 2. Optimistic guard: redirect unauthenticated /admin requests to
 *    /login. This is cookie/JWT-based only (per Next.js guidance, no DB
 *    reads in proxy); the authoritative role check (admin vs member,
 *    from public.profiles) lives in the /admin server layout.
 *
 * /office intentionally stays public — anonymous visitors browse as
 * guests under RLS.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    // Unconfigured (DEMO in development, fail-closed pages in
    // production) — nothing to refresh.
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Verifies the JWT (and refreshes the session when expired). Do not
  // trust getSession() alone for authorization decisions.
  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed session cookies on the redirect response.
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return supabaseResponse;
}
