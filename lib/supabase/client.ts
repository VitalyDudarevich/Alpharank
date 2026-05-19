import { createBrowserClient } from "@supabase/ssr";

export function createClient(rememberMe = true) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: rememberMe,
        storage:
          typeof window !== "undefined"
            ? rememberMe
              ? window.localStorage
              : window.sessionStorage
            : undefined,
      },
    }
  );
}

export const REMEMBER_EMAIL_KEY = "alpharank_remember_email";
