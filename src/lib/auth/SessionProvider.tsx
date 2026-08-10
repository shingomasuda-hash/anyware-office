"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserRole } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toCurrentUser, type CurrentUser } from "./types";

// Client-side CurrentUser context. The server layout resolves the user
// once per request and passes it as initialUser; components read it from
// here instead of querying profiles themselves. Auth state changes
// (sign-in / sign-out / token refresh) keep it current. STEP 3 Presence
// will consume this same context.

const SessionContext = createContext<CurrentUser | null>(null);

/** STEP 4: lets the profile editor re-pull the profile after a save. */
const SessionRefreshContext = createContext<() => Promise<void>>(
  async () => {},
);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(initialUser);

  const refresh = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (data) setUser(toCurrentUser(data));
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      const authUser = session?.user;
      if (
        authUser &&
        (event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED")
      ) {
        void supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setUser(toCurrentUser(data));
          });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={user}>
      <SessionRefreshContext.Provider value={refresh}>
        {children}
      </SessionRefreshContext.Provider>
    </SessionContext.Provider>
  );
}

export function useCurrentUser(): CurrentUser | null {
  return useContext(SessionContext);
}

/** Re-fetch the current profile into the session context (STEP 4). */
export function useSessionRefresh(): () => Promise<void> {
  return useContext(SessionRefreshContext);
}

/** The viewer's effective role — "guest" when anonymous. */
export function useSessionRole(): UserRole {
  return useCurrentUser()?.role ?? "guest";
}
