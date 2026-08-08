import type { Tables } from "@/types/database";

/**
 * The authenticated user's profile as exposed to the app (client-safe
 * shape, also the base for STEP 3 Presence). Derived from public.profiles,
 * which is 1:1 with auth.users.
 */
export type CurrentUser = Pick<
  Tables<"profiles">,
  | "id"
  | "name"
  | "email"
  | "role"
  | "position"
  | "department"
  | "status"
  | "avatar_url"
  | "bio"
  | "today_schedule"
  | "is_public"
>;

export function toCurrentUser(profile: Tables<"profiles">): CurrentUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    position: profile.position,
    department: profile.department,
    status: profile.status,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    today_schedule: profile.today_schedule,
    is_public: profile.is_public,
  };
}
