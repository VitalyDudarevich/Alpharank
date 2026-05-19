"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getLeagueConcludeReason,
  isGameLocked,
  isLeagueConcluded,
  maxMemberWins,
  type GameWinTotals,
  type MemberWinTotals,
} from "@/lib/league-season";

async function assertOwner(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const, supabase: null, userId: null };

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  if (member?.role !== "owner") {
    return { error: "Только создатель может редактировать" as const, supabase: null, userId: null };
  }

  return { error: null, supabase, userId: user.id };
}

export async function fetchLeagueWinTotals(leagueId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("score_events")
    .select("winner_member_id, game_id")
    .eq("league_id", leagueId)
    .is("deleted_at", null);

  const memberTotals: MemberWinTotals = {};
  const gameTotals: GameWinTotals = {};

  for (const row of data ?? []) {
    memberTotals[row.winner_member_id] =
      (memberTotals[row.winner_member_id] ?? 0) + 1;
    gameTotals[row.game_id] = (gameTotals[row.game_id] ?? 0) + 1;
  }

  return { memberTotals, gameTotals };
}

export async function maybeAutoConcludeLeague(leagueId: string) {
  const supabase = await createClient();

  const [{ data: league }, totals] = await Promise.all([
    supabase
      .from("leagues")
      .select("ends_at, target_wins, concluded_at")
      .eq("id", leagueId)
      .single(),
    fetchLeagueWinTotals(leagueId),
  ]);

  if (!league || league.concluded_at) return;

  const reason = getLeagueConcludeReason(league, totals.memberTotals);
  if (!reason) return;

  await supabase
    .from("leagues")
    .update({ concluded_at: new Date().toISOString() })
    .eq("id", leagueId);

  revalidatePath(`/league/${leagueId}`);
}

export async function updateLeagueSeason(
  leagueId: string,
  data: { ends_at: string | null; target_wins: number | null }
) {
  const auth = await assertOwner(leagueId);
  if (auth.error || !auth.supabase) return { error: auth.error! };

  const targetWins =
    data.target_wins != null && data.target_wins > 0 ? data.target_wins : null;

  const { error } = await auth.supabase
    .from("leagues")
    .update({
      ends_at: data.ends_at || null,
      target_wins: targetWins,
    })
    .eq("id", leagueId);

  if (error) return { error: error.message };

  const totals = await fetchLeagueWinTotals(leagueId);
  const { data: league } = await auth.supabase
    .from("leagues")
    .select("ends_at, target_wins, concluded_at")
    .eq("id", leagueId)
    .single();

  if (league && !league.concluded_at && isLeagueConcluded(league, totals.memberTotals)) {
    await auth.supabase
      .from("leagues")
      .update({ concluded_at: new Date().toISOString() })
      .eq("id", leagueId);
  }

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function updateGameSeason(
  leagueId: string,
  gameId: string,
  data: { ends_at: string | null; target_wins: number | null }
) {
  const auth = await assertOwner(leagueId);
  if (auth.error || !auth.supabase) return { error: auth.error! };

  const targetWins =
    data.target_wins != null && data.target_wins > 0 ? data.target_wins : null;

  const { error } = await auth.supabase
    .from("games")
    .update({
      ends_at: data.ends_at || null,
      target_wins: targetWins,
    })
    .eq("id", gameId)
    .eq("league_id", leagueId);

  if (error) return { error: error.message };

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function saveLeagueSeasonSettings(
  leagueId: string,
  payload: {
    league: { ends_at: string | null; target_wins: number | null };
    games: { id: string; ends_at: string | null; target_wins: number | null }[];
  }
) {
  const auth = await assertOwner(leagueId);
  if (auth.error || !auth.supabase) return { error: auth.error! };

  const leagueTarget =
    payload.league.target_wins != null && payload.league.target_wins > 0
      ? payload.league.target_wins
      : null;

  const { error: leagueError } = await auth.supabase
    .from("leagues")
    .update({
      ends_at: payload.league.ends_at || null,
      target_wins: leagueTarget,
    })
    .eq("id", leagueId);

  if (leagueError) return { error: leagueError.message };

  for (const game of payload.games) {
    const gameTarget =
      game.target_wins != null && game.target_wins > 0 ? game.target_wins : null;
    const { error } = await auth.supabase
      .from("games")
      .update({
        ends_at: game.ends_at || null,
        target_wins: gameTarget,
      })
      .eq("id", game.id)
      .eq("league_id", leagueId);
    if (error) return { error: error.message };
  }

  const totals = await fetchLeagueWinTotals(leagueId);
  const { data: league } = await auth.supabase
    .from("leagues")
    .select("ends_at, target_wins, concluded_at")
    .eq("id", leagueId)
    .single();

  if (league && !league.concluded_at && isLeagueConcluded(league, totals.memberTotals)) {
    await auth.supabase
      .from("leagues")
      .update({ concluded_at: new Date().toISOString() })
      .eq("id", leagueId);
  }

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function continueLeague(leagueId: string) {
  const auth = await assertOwner(leagueId);
  if (auth.error || !auth.supabase) return { error: auth.error! };

  const { error } = await auth.supabase
    .from("leagues")
    .update({ concluded_at: null })
    .eq("id", leagueId);

  if (error) return { error: error.message };

  await auth.supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "league_continued",
    payload: {},
    actor_id: auth.userId!,
  });

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function assertCanRecordWin(
  leagueId: string,
  gameId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const [{ data: league }, { data: game }, totals] = await Promise.all([
    supabase
      .from("leagues")
      .select("ends_at, target_wins, concluded_at")
      .eq("id", leagueId)
      .single(),
    supabase.from("games").select("target_wins, ends_at").eq("id", gameId).single(),
    fetchLeagueWinTotals(leagueId),
  ]);

  if (!league || !game) return { error: "Лига или игра не найдена" };

  if (isLeagueConcluded(league, totals.memberTotals)) {
    return { error: "Лига завершена — итоги подведены, новые результаты не принимаются" };
  }

  const gameTotal = totals.gameTotals[gameId] ?? 0;

  if (isGameLocked(game, gameTotal, false)) {
    if (game.target_wins != null && gameTotal >= game.target_wins) {
      return { error: `Достигнут лимит побед для игры (${game.target_wins})` };
    }
    return { error: "Эта игра закрыта для новых результатов" };
  }

  if (
    league.target_wins != null &&
    maxMemberWins(totals.memberTotals) >= league.target_wins
  ) {
    return { error: "Достигнут лимит побед в лиге" };
  }

  return {};
}
