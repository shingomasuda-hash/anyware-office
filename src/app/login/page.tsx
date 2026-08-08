import type { Metadata } from "next";
import ConfigurationError from "@/components/system/ConfigurationError";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login — AnyWare OFFICE",
};

export default function LoginPage() {
  if (!isSupabaseConfigured() && process.env.NODE_ENV === "production") {
    return <ConfigurationError />;
  }
  return <LoginForm />;
}
