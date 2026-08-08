/**
 * Production fail-closed screen: rendered when the app runs a production
 * build without Supabase configuration. DEMO MODE is a development-only
 * convenience and must never be publicly served as the real office.
 */
export default function ConfigurationError() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center dark:bg-zinc-950"
      data-testid="configuration-error"
    >
      <p className="text-xs font-semibold tracking-[0.3em] text-red-600">
        CONFIGURATION ERROR
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        AnyWare OFFICE is not configured
      </h1>
      <p className="max-w-md text-sm leading-6 text-zinc-500">
        Supabaseの接続情報（NEXT_PUBLIC_SUPABASE_URL /
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）が設定されていません。
        本番環境ではデモモードは無効です。環境変数を設定して再デプロイしてください。
      </p>
    </main>
  );
}
