/**
 * Raised when a configured data source fails (network error, RLS denial
 * on write, schema mismatch, missing row). This must surface to the UI —
 * a configured Supabase connection never silently falls back to demo data.
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export function repositoryErrorMessage(error: unknown): string {
  if (error instanceof RepositoryError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
