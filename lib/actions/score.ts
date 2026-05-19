"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateMultiplayerElo, DEFAULT_RATING } from "@/lib/elo";
import { assertCanRecordWin, maybeAutoConcludeLeague } from "@/lib/actions/season";

export async function addWin(params: {
  leagueId: string;
  sessionId: string;
  gameId: string;
  winnerMemberId: string;
  participantIds: string[];
  winnerDisplayName: string;
  gameName: string;
  eloEnabled?: boolean;
  eloK?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const {
    leagueId,
    sessionId,
    gameId,
    winnerMemberId,
    participantIds,
    winnerDisplayName,
    gameName,
    eloEnabled = false,
    eloK = 32,
  } = params;

  if (!participantIds.includes(winnerMemberId)) {
    return { error: "Победитель должен быть среди участников" };
  }

  const canRecord = await assertCanRecordWin(leagueId, gameId);
  if (canRecord.error) return { error: canRecord.error };

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
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Ошибка записи" };

  // Тяжёлую работу — после ответа клиенту (не блокирует UI)
  after(async () => {
    const bg = await createClient();
    await maybeAutoConcludeLeague(leagueId);
    await bg.from("audit_logs").insert({
      league_id: leagueId,
      action: "win_added",
      payload: {
        event_id: event.id,
        winner: winnerDisplayName,
        game: gameName,
        participants: participantIds,
      },
      actor_id: user.id,
    });
    if (eloEnabled) {
      await updateEloRatings(bg, gameId, participantIds, winnerMemberId, eloK);
    }
  });

  return { success: true, eventId: event.id };
}

async function updateEloRatings(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

    const updated = updateMultiplayerElo(
      participantIds.map((id) => ({ memberId: id, rating: ratingMap.get(id)! })),
      winnerId,
      k
    );

    await Promise.all(
      updated.map(async (u) => {
        if (scopeGameId === null) {
          const { data: row } = await supabase
            .from("elo_ratings")
            .select("id")
            .eq("member_id", u.memberId)
            .is("game_id", null)
            .maybeSingle();
          if (row) {
            return supabase
              .from("elo_ratings")
              .update({ rating: u.rating, updated_at: new Date().toISOString() })
              .eq("id", row.id);
          }
          return supabase.from("elo_ratings").insert({
            member_id: u.memberId,
            game_id: null,
            rating: u.rating,
          });
        }
        const { data: row } = await supabase
          .from("elo_ratings")
          .select("id")
          .eq("member_id", u.memberId)
          .eq("game_id", scopeGameId)
          .maybeSingle();
        if (row) {
          return supabase
            .from("elo_ratings")
            .update({ rating: u.rating, updated_at: new Date().toISOString() })
            .eq("id", row.id);
        }
        return supabase.from("elo_ratings").insert({
          member_id: u.memberId,
          game_id: scopeGameId,
          rating: u.rating,
        });
      })
    );
  }
}

export async function addStandaloneWin(params: {
  sessionId: string;
  winnerParticipantId: string;
  participantIds: string[];
  winnerDisplayName: string;
  gameName: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const {
    sessionId,
    winnerParticipantId,
    participantIds,
    winnerDisplayName,
    gameName,
  } = params;

  if (!participantIds.includes(winnerParticipantId)) {
    return { error: "Победитель должен быть среди участников" };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, created_by")
    .eq("id", sessionId)
    .is("league_id", null)
    .single();

  if (!session || session.created_by !== user.id) {
    return { error: "Сражение не найдено" };
  }
  if (session.status !== "active") {
    return { error: "Сражение завершено" };
  }

  const { data: event, error } = await supabase
    .from("score_events")
    .insert({
      league_id: null,
      session_id: sessionId,
      game_id: null,
      winner_member_id: null,
      winner_participant_id: winnerParticipantId,
      participant_ids: participantIds,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Ошибка записи" };

  after(async () => {
    console.info("standalone win", {
      event_id: event.id,
      winner: winnerDisplayName,
      game: gameName,
    });
  });

  return { success: true, eventId: event.id };
}

export async function undoWin(leagueId: string | null, eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: event } = await supabase
    .from("score_events")
    .select("created_by, created_at")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Событие не найдено" };

  const isAuthor = event.created_by === user.id;
  const within5Min = Date.now() - new Date(event.created_at).getTime() < 5 * 60 * 1000;

  if (!isAuthor && !within5Min) {
    if (!leagueId) {
      return { error: "Нельзя отменить это действие" };
    }
    const { data: member } = await supabase
      .from("league_members")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", user.id)
      .single();
    if (member?.role !== "owner") {
      return { error: "Нельзя отменить это действие" };
    }
  }

  const { error } = await supabase
    .from("score_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { error: error.message };

  after(async () => {
    if (!leagueId) return;
    const bg = await createClient();
    await bg.from("audit_logs").insert({
      league_id: leagueId,
      action: "win_undone",
      payload: { event_id: eventId },
      actor_id: user.id,
    });
  });

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

  after(async () => {
    const bg = await createClient();
    await bg.from("audit_logs").insert({
      league_id: leagueId,
      action: "participants_updated",
      payload: { session_id: sessionId, member_ids: memberIds },
      actor_id: user.id,
    });
  });

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
