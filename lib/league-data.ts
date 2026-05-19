import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getLeagueContext(leagueId: string) {
  const { supabase, user } = await requireUser();

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  if (!league) redirect("/");

  const { data: members } = await supabase
    .from("league_members")
    .select("*")
    .eq("league_id", leagueId)
    .order("display_name");

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("league_id", leagueId)
    .order("sort_order");

  const currentMember = members?.find((m) => m.user_id === user.id);

  if (!currentMember) redirect("/");

  return {
    supabase,
    user,
    league,
    members: members ?? [],
    games: games ?? [],
    currentMember,
  };
}
