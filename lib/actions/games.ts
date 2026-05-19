"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserGame } from "@/lib/types";

/** Уникальные названия: каталог user_games + игры из прошлых сражений. */
export async function fetchKnownGameNames(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [catalogRes, sessionsRes] = await Promise.all([
    supabase.from("user_games").select("name").eq("user_id", user.id),
    supabase
      .from("sessions")
      .select("game_name")
      .eq("created_by", user.id)
      .not("game_name", "is", null),
  ]);

  const byLower = new Map<string, string>();
  for (const row of catalogRes.data ?? []) {
    const name = row.name.trim();
    if (name) byLower.set(name.toLowerCase(), name);
  }
  for (const row of sessionsRes.data ?? []) {
    const name = row.game_name?.trim();
    if (name && !byLower.has(name.toLowerCase())) {
      byLower.set(name.toLowerCase(), name);
    }
  }

  return [...byLower.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

export async function fetchUserGames(): Promise<UserGame[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_games")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (data ?? []) as UserGame[];
}

export async function addUserGameByName(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Укажите название игры" };

  const { data: existing } = await supabase
    .from("user_games")
    .select("id, name")
    .eq("user_id", user.id);

  const lower = trimmed.toLowerCase();
  const found = (existing ?? []).find((g) => g.name.toLowerCase() === lower);
  if (found) return { success: true, game: found as UserGame };

  const maxOrder = (existing ?? []).reduce(
    (m, g) => Math.max(m, (g as { sort_order?: number }).sort_order ?? 0),
    0
  );

  const { data: created, error } = await supabase
    .from("user_games")
    .insert({
      user_id: user.id,
      name: trimmed,
      sort_order: maxOrder + 1,
    })
    .select()
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Не удалось добавить игру" };
  }

  revalidatePath("/");
  revalidatePath("/stats");
  return { success: true, game: created as UserGame };
}

export async function deleteUserGame(gameId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { error } = await supabase
    .from("user_games")
    .delete()
    .eq("id", gameId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/stats");
  return { success: true };
}
