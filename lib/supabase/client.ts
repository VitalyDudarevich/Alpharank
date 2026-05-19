import { createBrowserClient } from "@supabase/ssr";

/** Сессия в cookies — нужна для middleware и Server Actions (@supabase/ssr). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const REMEMBER_EMAIL_KEY = "alpharank_remember_email";
