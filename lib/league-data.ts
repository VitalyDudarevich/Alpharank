import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLeagueConcludeReason } from "@/lib/league-season";

export const getLeagueContext = cache(async (leagueId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [leagueRes, membersRes, gamesRes] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", leagueId).single(),
    supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .order("display_name"),
    supabase
      .from("games")
      .select("*")
      .eq("league_id", leagueId)
      .order("sort_order"),
  ]);

  const league = leagueRes.data;
  if (!league) redirect("/");

  const members = membersRes.data ?? [];
  const games = gamesRes.data ?? [];
  const currentMember = members.find((m) => m.user_id === user.id);

  if (!currentMember) redirect("/");

  if (league && !league.concluded_at) {
    const { data: winRows } = await supabase
      .from("score_events")
      .select("winner_member_id")
      .eq("league_id", leagueId)
      .is("deleted_at", null);

    const memberTotals: Record<string, number> = {};
    for (const row of winRows ?? []) {
      memberTotals[row.winner_member_id] =
        (memberTotals[row.winner_member_id] ?? 0) + 1;
    }

    const reason = getLeagueConcludeReason(league, memberTotals);
    if (reason) {
      const concludedAt = new Date().toISOString();
      await supabase
        .from("leagues")
        .update({ concluded_at: concludedAt })
        .eq("id", leagueId);
      league.concluded_at = concludedAt;
    }
  }

  return {
    supabase,
    user,
    league,
    members,
    games,
    currentMember,
  };
});
