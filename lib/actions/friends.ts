"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UserFriend = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

/** Каталог user_friends + имена из прошлых сражений. */
export async function fetchKnownFriendNames(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("created_by", user.id);

  const sessionIds = (sessions ?? []).map((s) => s.id);

  const [catalogRes, partsRes] = await Promise.all([
    supabase.from("user_friends").select("name").eq("user_id", user.id),
    sessionIds.length > 0
      ? supabase
          .from("battle_participants")
          .select("display_name")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { display_name: string }[] }),
  ]);

  const byLower = new Map<string, string>();
  for (const row of catalogRes.data ?? []) {
    const name = row.name.trim();
    if (name) byLower.set(name.toLowerCase(), name);
  }
  for (const row of partsRes.data ?? []) {
    const name = row.display_name?.trim();
    if (name && !byLower.has(name.toLowerCase())) {
      byLower.set(name.toLowerCase(), name);
    }
  }

  return [...byLower.values()].sort((a, b) => a.localeCompare(b, "ru"));
}

export async function addUserFriendByName(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Укажите имя" as const };

  const { data: existing } = await supabase
    .from("user_friends")
    .select("id, name, sort_order, created_at, user_id")
    .eq("user_id", user.id);

  const lower = trimmed.toLowerCase();
  const found = (existing ?? []).find((f) => f.name.toLowerCase() === lower);
  if (found) {
    return { success: true as const, friend: found as UserFriend };
  }

  const maxOrder = (existing ?? []).reduce(
    (m, f) => Math.max(m, f.sort_order ?? 0),
    0
  );

  const { data: created, error } = await supabase
    .from("user_friends")
    .insert({
      user_id: user.id,
      name: trimmed,
      sort_order: maxOrder + 1,
    })
    .select()
    .single();

  if (error || !created) {
    return { error: error?.message ?? "Не удалось сохранить" };
  }

  revalidatePath("/");
  return { success: true as const, friend: created as UserFriend };
}

/** Сохранить в каталог всех участников сражения (при старте). */
export async function ensureFriendsInCatalog(names: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("user_friends")
    .select("name")
    .eq("user_id", user.id);

  const known = new Set(
    (existing ?? []).map((f) => f.name.trim().toLowerCase())
  );
  let maxOrder = existing?.length ?? 0;

  const toInsert: { user_id: string; name: string; sort_order: number }[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (known.has(lower)) continue;
    known.add(lower);
    maxOrder += 1;
    toInsert.push({
      user_id: user.id,
      name,
      sort_order: maxOrder,
    });
  }

  if (toInsert.length > 0) {
    await supabase.from("user_friends").insert(toInsert);
  }
}
