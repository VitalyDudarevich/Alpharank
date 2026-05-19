"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addGame(leagueId: string, formData: FormData) {
  const supabase = await createClient();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const { data: games } = await supabase
    .from("games")
    .select("sort_order")
    .eq("league_id", leagueId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = (games?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("games").insert({
    league_id: leagueId,
    name,
    sort_order: sortOrder,
  });

  if (error) return;
  revalidatePath(`/league/${leagueId}`);
}

export async function deleteGame(leagueId: string, gameId: string) {
  const supabase = await createClient();
  await supabase.from("games").delete().eq("id", gameId);
  revalidatePath(`/league/${leagueId}`);
}
