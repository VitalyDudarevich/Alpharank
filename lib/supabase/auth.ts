import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Возвращает текущего пользователя, кэшируя результат на время одного
 * серверного рендера (React `cache`). Layout и страница вызывают его
 * совместно — поход в Supabase Auth происходит один раз за запрос, а не на
 * каждый вызов.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
