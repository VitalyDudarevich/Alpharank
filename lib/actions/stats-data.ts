"use server";

import { createClient } from "@/lib/supabase/server";
import type { ScoreEvent, ScoringMode, StatsPlayer } from "@/lib/types";
import { playerIdFromName } from "@/lib/stats";

export async function fetchUserStatsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, game_name, scoring_mode, participant_slots")
    .eq("created_by", user.id);

  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length === 0) {
    return {
      events: [] as ScoreEvent[],
      players: [] as StatsPlayer[],
      gameNames: [] as string[],
    };
  }

  const gameNameBySession = new Map(
    (sessions ?? []).map((s) => [s.id, s.game_name?.trim() || "—"])
  );
  const scoringBySession = new Map(
    (sessions ?? []).map((s) => [
      s.id,
      (s.scoring_mode ?? "classic") as ScoringMode,
    ])
  );
  const slotsBySession = new Map(
    (sessions ?? []).map((s) => [s.id, s.participant_slots as number | null])
  );

  const [{ data: eventsRaw }, { data: participants }] = await Promise.all([
    supabase
      .from("score_events")
      .select(
        "id, session_id, winner_participant_id, participant_ids, placements, created_by, created_at, deleted_at"
      )
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("battle_participants")
      .select("id, session_id, display_name")
      .in("session_id", sessionIds),
  ]);

  const nameByParticipantId = new Map<string, string>();
  for (const p of participants ?? []) {
    nameByParticipantId.set(p.id, p.display_name);
  }

  const playerNames = new Set<string>();
  for (const p of participants ?? []) {
    playerNames.add(p.display_name.trim());
  }

  const players: StatsPlayer[] = [...playerNames]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((display_name) => ({
      id: playerIdFromName(display_name),
      display_name,
    }));

  const nameToPlayerId = new Map(
    players.map((p) => [p.display_name.toLowerCase(), p.id])
  );

  const toPlayerId = (pid: string) => {
    const name = nameByParticipantId.get(pid) ?? "?";
    return nameToPlayerId.get(name.toLowerCase()) ?? playerIdFromName(name);
  };

  const events: ScoreEvent[] = (eventsRaw ?? []).map((e) => {
    const rosterIds = e.participant_ids.map(toPlayerId);
    const winnerPlayerId = toPlayerId(e.winner_participant_id);

    // Места перекладываем на имя-id игрока, чтобы очки агрегировались
    // кросс-сессионно так же, как победы.
    let placements: Record<string, number> | null = null;
    if (e.placements && typeof e.placements === "object") {
      placements = {};
      for (const [pid, place] of Object.entries(
        e.placements as Record<string, number>
      )) {
        placements[toPlayerId(pid)] = place;
      }
    }

    return {
      id: e.id,
      session_id: e.session_id,
      winner_participant_id: winnerPlayerId,
      participant_ids: rosterIds,
      placements,
      created_by: e.created_by,
      created_at: e.created_at,
      deleted_at: e.deleted_at,
      game_name: gameNameBySession.get(e.session_id),
      scoring_mode: scoringBySession.get(e.session_id),
      participant_slots: slotsBySession.get(e.session_id) ?? null,
    };
  });

  const gameNames = [
    ...new Set(
      (sessions ?? [])
        .map((s) => s.game_name?.trim())
        .filter((n): n is string => !!n)
    ),
  ].sort((a, b) => a.localeCompare(b, "ru"));

  return { events, players, gameNames };
}
