"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BattleParticipant } from "@/lib/types";

export type StandaloneArenaHistoryItem = {
  id: string;
  game_name: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
  event_count: number;
};

export async function fetchStandaloneArenaState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: active } = await supabase
    .from("sessions")
    .select("*")
    .is("league_id", null)
    .eq("created_by", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { data: historyRows } = await supabase
    .from("sessions")
    .select("id, game_name, session_date, started_at, ended_at")
    .is("league_id", null)
    .eq("created_by", user.id)
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
        .from("battle_participants")
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

  const history: StandaloneArenaHistoryItem[] = (historyRows ?? []).map(
    (row) => ({
      id: row.id,
      game_name: row.game_name?.trim() || "—",
      session_date: row.session_date,
      started_at: row.started_at,
      ended_at: row.ended_at,
      participant_count: participantCounts[row.id] ?? 0,
      event_count: eventCounts[row.id] ?? 0,
    })
  );

  let activeSession: {
    id: string;
    game_name: string;
    started_at: string | null;
  } | null = null;
  let participants: BattleParticipant[] = [];

  if (active) {
    activeSession = {
      id: active.id,
      game_name: active.game_name?.trim() || "Игра",
      started_at: active.started_at,
    };
    const { data: parts } = await supabase
      .from("battle_participants")
      .select("*")
      .eq("session_id", active.id)
      .order("created_at", { ascending: true });
    participants = (parts ?? []) as BattleParticipant[];
  }

  return { activeSession, participants, history };
}

export async function startStandaloneBattle(params: {
  gameName: string;
  participantNames: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const gameName = params.gameName.trim();
  const names = [
    ...new Set(
      params.participantNames.map((n) => n.trim()).filter((n) => n.length > 0)
    ),
  ];

  if (!gameName) return { error: "Укажите название игры" };
  if (names.length < 2) return { error: "Нужно минимум 2 участника" };

  const { data: existingActive } = await supabase
    .from("sessions")
    .select("id")
    .is("league_id", null)
    .eq("created_by", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (existingActive) {
    return {
      error: "Уже есть активное сражение. Завершите его перед новым.",
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      league_id: null,
      created_by: user.id,
      session_date: today,
      game_name: gameName,
      game_id: null,
      status: "active",
      started_at: now,
    })
    .select()
    .single();

  if (error || !session) {
    return { error: error?.message ?? "Не удалось создать сражение" };
  }

  const { data: parts, error: partError } = await supabase
    .from("battle_participants")
    .insert(
      names.map((display_name) => ({
        session_id: session.id,
        display_name,
        user_id: null,
      }))
    )
    .select();

  if (partError || !parts?.length) {
    await supabase.from("sessions").delete().eq("id", session.id);
    return { error: partError?.message ?? "Не удалось добавить участников" };
  }

  revalidatePath("/arena");
  return { success: true, sessionId: session.id };
}

export async function endStandaloneBattle(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, created_by")
    .eq("id", sessionId)
    .is("league_id", null)
    .single();

  if (!session || session.created_by !== user.id) {
    return { error: "Сражение не найдено" };
  }
  if (session.status !== "active") return { error: "Сражение уже завершено" };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: now })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath("/arena");
  return { success: true };
}
