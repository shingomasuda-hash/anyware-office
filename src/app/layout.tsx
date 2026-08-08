import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SessionProvider } from "@/lib/auth/SessionProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnyWare OFFICE",
  description: "Browser-based 2D metaverse office for AnyWare Inc.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // One server-side identity resolution per request; clients read it via
  // SessionProvider instead of each querying profiles. Root layout errors
  // must not take the whole site down — the /admin guard re-checks
  // authoritatively.
  const initialUser = isSupabaseConfigured()
    ? await getCurrentUser().catch(() => null)
    : null;

  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider initialUser={initialUser}>{children}</SessionProvider>
      </body>
    </html>
  );
}
