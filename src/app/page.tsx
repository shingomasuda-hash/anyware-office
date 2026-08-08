import Link from "next/link";

const links = [
  { href: "/office", label: "OFFICE", description: "Enter the virtual office" },
  { href: "/login", label: "LOGIN", description: "Sign in (coming soon)" },
  { href: "/admin", label: "ADMIN", description: "Admin console (coming soon)" },
] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
      <div className="text-center">
        <p className="text-xs font-medium tracking-[0.3em] text-zinc-500">
          STEP 0 FOUNDATION
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          AnyWare OFFICE
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-500">
          Browser-based 2D metaverse office for AnyWare Inc.
        </p>
      </div>
      <nav className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-zinc-200 px-5 py-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="block text-sm font-semibold tracking-wide">
              {link.label}
            </span>
            <span className="mt-1 block text-xs text-zinc-500">
              {link.description}
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
