"use client";

export function LoadingState() {
  return (
    <div
      className="flex flex-col items-center gap-2 py-12 text-zinc-400"
      data-testid="admin-loading"
    >
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      <p className="text-xs tracking-wider">LOADING</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950"
      data-testid="admin-error"
      role="alert"
    >
      <p className="text-xs font-semibold tracking-wider text-red-700 dark:text-red-400">
        DATA ERROR
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-red-600 dark:text-red-400">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <p
      className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-400 dark:border-zinc-700"
      data-testid="admin-empty"
    >
      {label}
    </p>
  );
}
