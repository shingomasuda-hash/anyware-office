import { getDataSource } from "./dataSource";
import { createMockRepositories } from "./mock";
import { createSupabaseRepositories } from "./supabase";
import type { Repositories } from "./types";

let cached: Repositories | null = null;

/**
 * Repository factory. SUPABASE when configured, DEMO otherwise.
 * A configured Supabase source that fails at runtime raises
 * RepositoryError — it never falls back to DEMO silently.
 */
export function getRepositories(): Repositories {
  if (!cached) {
    cached =
      getDataSource() === "SUPABASE"
        ? createSupabaseRepositories()
        : createMockRepositories();
  }
  return cached;
}

export { getDataSource } from "./dataSource";
export { RepositoryError, repositoryErrorMessage } from "./errors";
export type * from "./types";
