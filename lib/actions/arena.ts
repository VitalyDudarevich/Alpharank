"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Game, LeagueMember, Session } from "@/lib/types";

export type ArenaSession = Session & {
  game_id: string | null;
  status: "active" | "ended";
  started_at: string | null;
  ended_at: string | null;
};

export type ArenaHistoryItem = {
  id: string;
  game_id: string | null;
  game_name: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
  event_count: number;
};

export async function fetchArenaState(leagueId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: active } = await supabase
    .from("sessions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("status", "active")
    .maybeSingle();

  const { data: historyRows } = await supabase
    .from("sessions")
    .select(
      "id, game_id, session_date, started_at, ended_at, game:games(name)"
    )
    .eq("league_id", leagueId)
    .eq("status", "ended")
    .order("ended_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const historyIds = (historyRows ?? []).map((r) => r.id);
  const participantCounts: Record<string, number> = {};
  const eventCounts: Record<string, number> = {};

  if (historyIds.length > 0) {
    const [partsRes, eventsRes] = await Promise.all([
      supabase
        .from("session_participants")
        .select("session_id")
        .in("session_id", historyIds),
      supabase
        .from("score_events")
        .select("session_id")
        .in("session_id", historyIds)
        .is("deleted_at", null),
    ]);
    for (const p of partsRes.data ?? []) {
      participantCounts[p.session_id] =
        (participantCounts[p.session_id] ?? 0) + 1;
    }
    for (const e of eventsRes.data ?? []) {
      eventCounts[e.session_id] = (eventCounts[e.session_id] ?? 0) + 1;
    }
  }

  const history: ArenaHistoryItem[] = (historyRows ?? []).map((row) => {
    const game = row.game as { name: string } | { name: string }[] | null;
    const gameName = (Array.isArray(game) ? game[0] : game)?.name ?? "—";
    return {
      id: row.id,
      game_id: row.game_id,
      game_name: gameName,
      session_date: row.session_date,
      started_at: row.started_at,
      ended_at: row.ended_at,
      participant_count: participantCounts[row.id] ?? 0,
      event_count: eventCounts[row.id] ?? 0,
    };
  });

  let activeSession: ArenaSession | null = null;
  let participantIds: string[] = [];
  let activeGame: Game | null = null;

  if (active) {
    activeSession = active as ArenaSession;
    const [participantsRes, gameRes] = await Promise.all([
      supabase
        .from("session_participants")
        .select("member_id")
        .eq("session_id", active.id),
      active.game_id
        ? supabase.from("games").select("*").eq("id", active.game_id).single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    participantIds = participantsRes.data?.map((p) => p.member_id) ?? [];
    activeGame = (gameRes.data as Game | null) ?? null;
  }

  const { data: todayParticipants } = await supabase
    .from("sessions")
    .select(
      `
      id,
      session_participants(member_id)
    `
    )
    .eq("league_id", leagueId)
    .eq("session_date", new Date().toISOString().split("T")[0])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const suggestedMemberIds: string[] = [];
  if (todayParticipants?.session_participants) {
    const parts = todayParticipants.session_participants as { member_id: string }[];
    for (const p of parts) {
      if (p.member_id) suggestedMemberIds.push(p.member_id);
    }
  }

  return {
    activeSession,
    activeGame,
    participantIds,
    history,
    suggestedMemberIds,
  };
}

export async function startBattle(params: {
  leagueId: string;
  gameId: string;
  memberIds: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { leagueId, gameId, memberIds } = params;

  const { data: existingActive } = await supabase
    .from("sessions")
    .select("id")
    .eq("league_id", leagueId)
    .eq("status", "active")
    .maybeSingle();

  if (existingActive) {
    return { error: "Уже есть активное сражение. Завершите его перед новым." };
  }

  const { data: game } = await supabase
    .from("games")
    .select("id, league_id")
    .eq("id", gameId)
    .eq("league_id", leagueId)
    .maybeSingle();

  if (!game) return { error: "Игра не найдена в этой лиге" };

  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("league_members")
      .select("id")
      .eq("league_id", leagueId)
      .in("id", memberIds);

    if (!members || members.length !== memberIds.length) {
      return { error: "Участники должны быть из списка лиги" };
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      league_id: leagueId,
      session_date: today,
      game_id: gameId,
      status: "active",
      started_at: now,
    })
    .select()
    .single();

  if (error || !session) {
    return { error: error?.message ?? "Не удалось создать сражение" };
  }

  if (memberIds.length > 0) {
    const { error: partError } = await supabase
      .from("session_participants")
      .insert(memberIds.map((member_id) => ({ session_id: session.id, member_id })));

    if (partError) {
      await supabase.from("sessions").delete().eq("id", session.id);
      return { error: partError.message };
    }
  }

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "battle_started",
    payload: {
      session_id: session.id,
      game_id: gameId,
      member_ids: memberIds,
    },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}/today`);
  return { success: true, sessionId: session.id };
}

export async function endBattle(leagueId: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, league_id, status")
    .eq("id", sessionId)
    .eq("league_id", leagueId)
    .single();

  if (!session) return { error: "Сражение не найдено" };
  if (session.status !== "active") return { error: "Сражение уже завершено" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: now })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    league_id: leagueId,
    action: "battle_ended",
    payload: { session_id: sessionId },
    actor_id: user.id,
  });

  revalidatePath(`/league/${leagueId}/today`);
  return { success: true };
}

export async function fetchBattleDetail(leagueId: string, sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("league_id", leagueId)
    .single();

  if (!session) return { error: "Сражение не найдено" as const };

  const [participantsRes, gameRes, eventsRes] = await Promise.all([
    supabase
      .from("session_participants")
      .select("member_id, league_members(id, display_name, user_id)")
      .eq("session_id", sessionId),
    session.game_id
      ? supabase.from("games").select("*").eq("id", session.game_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("score_events")
      .select(
        `
        id, winner_member_id, participant_ids, game_id, created_at, created_by, deleted_at,
        winner:league_members!winner_member_id(display_name)
      `
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const members: LeagueMember[] =
    participantsRes.data
      ?.map((row) => {
        const lm = row.league_members as LeagueMember | LeagueMember[] | null;
        return Array.isArray(lm) ? lm[0] : lm;
      })
      .filter((m): m is LeagueMember => !!m) ?? [];

  const events = eventsRes.data ?? [];
  const actorIds = [...new Set(events.map((e) => e.created_by))];
  const actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      actorNames[p.id] = p.display_name;
    }
  }

  return {
    session: session as ArenaSession,
    game: (gameRes.data as Game | null) ?? null,
    members,
    events,
    actorNames,
  };
}
