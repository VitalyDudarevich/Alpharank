"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMultiplayerElo, DEFAULT_RATING } from "@/lib/elo";

export async function addWin(params: {
  leagueId: string;
  sessionId: string;
  gameId: string;
  winnerMemberId: string;
  participantIds: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { leagueId, sessionId, gameId, winnerMemberId, participantIds } = params;

  if (!participantIds.includes(winnerMemberId)) {
    return { error: "Победитель должен быть среди участников" };
  }

  const { data: event, error } = await supabase
    .from("score_events")
    .insert({
      league_id: leagueId,
      session_id: sessionId,
      game_id: gameId,
      winner_member_id: winnerMemberId,
      participant_ids: participantIds,
      created_by: user.id,
    })
    .select()
    .single();

  if (error || !event) return { error: error?.message ?? "Ошибка записи" };

  const { data: member } = await supabase
    .from("league_members")
    .select("display_name")
    .eq("id", winnerMemberId)
    .single();

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "win_added",
    payload: {
      event_id: event.id,
      winner: member?.display_name,
      game_id: gameId,
      participants: participantIds,
    },
    actor_id: user.id,
  });

  const { data: league } = await supabase
    .from("leagues")
    .select("elo_enabled, elo_k")
    .eq("id", leagueId)
    .single();

  if (league?.elo_enabled) {
    await updateEloRatings(
      supabase,
      leagueId,
      gameId,
      participantIds,
      winnerMemberId,
      league.elo_k
    );
  }

  revalidatePath(`/league/${leagueId}`);
  return { success: true, eventId: event.id };
}

async function updateEloRatings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leagueId: string,
  gameId: string,
  participantIds: string[],
  winnerId: string,
  k: number
) {
  const scopes: (string | null)[] = [gameId, null];

  for (const scopeGameId of scopes) {
    const { data: existing } = await supabase
      .from("elo_ratings")
      .select("member_id, rating")
      .in("member_id", participantIds)
      .is("game_id", scopeGameId);

    const ratingMap = new Map<string, number>();
    participantIds.forEach((id) => {
      const found = existing?.find((e) => e.member_id === id);
      ratingMap.set(id, found ? Number(found.rating) : DEFAULT_RATING);
    });

    const ratings = participantIds.map((id) => ({
      memberId: id,
      rating: ratingMap.get(id)!,
    }));

    const updated = updateMultiplayerElo(ratings, winnerId, k);

    for (const u of updated) {
      if (scopeGameId === null) {
        const { data: row } = await supabase
          .from("elo_ratings")
          .select("id")
          .eq("member_id", u.memberId)
          .is("game_id", null)
          .maybeSingle();

        if (row) {
          await supabase
            .from("elo_ratings")
            .update({ rating: u.rating, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        } else {
          await supabase.from("elo_ratings").insert({
            member_id: u.memberId,
            game_id: null,
            rating: u.rating,
          });
        }
      } else {
        const { data: row } = await supabase
          .from("elo_ratings")
          .select("id")
          .eq("member_id", u.memberId)
          .eq("game_id", scopeGameId)
          .maybeSingle();

        if (row) {
          await supabase
            .from("elo_ratings")
            .update({ rating: u.rating, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        } else {
          await supabase.from("elo_ratings").insert({
            member_id: u.memberId,
            game_id: scopeGameId,
            rating: u.rating,
          });
        }
      }
    }
  }
}

export async function undoWin(leagueId: string, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: event } = await supabase
    .from("score_events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Событие не найдено" };

  const createdAt = new Date(event.created_at).getTime();
  const fiveMin = 5 * 60 * 1000;
  const isAuthor = event.created_by === user.id;

  const { data: member } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .single();

  const isOwner = member?.role === "owner";
  const canUndo = isOwner || (isAuthor && Date.now() - createdAt < fiveMin);

  if (!canUndo) return { error: "Нельзя отменить это действие" };

  const { error } = await supabase
    .from("score_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "win_undone",
    payload: { event_id: eventId },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}`);
  return { success: true };
}

export async function updateSessionParticipants(
  sessionId: string,
  leagueId: string,
  memberIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  await supabase.from("session_participants").delete().eq("session_id", sessionId);

  if (memberIds.length > 0) {
    const { error } = await supabase.from("session_participants").insert(
      memberIds.map((member_id) => ({ session_id: sessionId, member_id }))
    );
    if (error) return { error: error.message };
  }

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "participants_updated",
    payload: { session_id: sessionId, member_ids: memberIds },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}/today`);
  return { success: true };
}

export async function getOrCreateTodaySession(leagueId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("sessions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("session_date", today)
    .maybeSingle();

  if (existing) return existing;

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({ league_id: leagueId, session_date: today })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return session;
}
