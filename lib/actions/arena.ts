"use server";

import { revalidatePath } from "next/cache";
import { ARENA_BATTLES_PAGE_SIZE } from "@/lib/arena-battles-page";
import {
  normalizeSeriesScoreEvents,
  seriesMemberIds,
  seriesMemberNames,
} from "@/lib/series-stats";
import { createClient } from "@/lib/supabase/server";
import type { BattleParticipant } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionScoreEvent } from "@/lib/session-stats";

type SessionRow = {
  id: string;
  game_name: string | null;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
};

export type ArenaBattlesPage = {
  battles: ArenaHistoryItem[];
  totalCount: number;
  endedOffset: number;
  hasMore: boolean;
};

export type ArenaHistoryItem = {
  id: string;
  game_name: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  status: "active" | "ended";
  participant_count: number;
  /** Имена участников в порядке добавления в сражение */
  participant_names: string[];
  event_count: number;
};

export type ActiveBattleState = {
  id: string;
  game_name: string;
  started_at: string | null;
  participants: BattleParticipant[];
};

export type BattleDetail = {
  session: {
    id: string;
    game_name: string;
    session_date: string;
    started_at: string | null;
    ended_at: string | null;
    status: string;
  };
  participants: BattleParticipant[];
  events: {
    id: string;
    winner_participant_id: string;
    participant_ids: string[];
    created_at: string;
    created_by: string | null;
    deleted_at: string | null;
  }[];
  actorNames: Record<string, string>;
};

export async function fetchBattleDetail(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, game_name, session_date, started_at, ended_at, status, created_by")
    .eq("id", sessionId)
    .single();

  if (!session || session.created_by !== user.id) {
    return { error: "Сражение не найдено" as const };
  }

  const [{ data: participants }, { data: events }] = await Promise.all([
    supabase
      .from("battle_participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("score_events")
      .select(
        "id, winner_participant_id, participant_ids, created_at, created_by, deleted_at"
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const actorIds = [
    ...new Set(
      (events ?? [])
        .map((e) => e.created_by)
        .filter((id): id is string => !!id)
    ),
  ];
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
    session: {
      id: session.id,
      game_name: session.game_name?.trim() || "—",
      session_date: session.session_date,
      started_at: session.started_at,
      ended_at: session.ended_at,
      status: session.status,
    },
    participants: (participants ?? []) as BattleParticipant[],
    events: events ?? [],
    actorNames,
  } satisfies BattleDetail;
}

async function enrichSessionRows(
  supabase: SupabaseClient,
  rows: SessionRow[]
): Promise<ArenaHistoryItem[]> {
  if (rows.length === 0) return [];

  const sessionIds = rows.map((r) => r.id);
  const participantNamesBySession: Record<string, string[]> = {};
  const eventCounts: Record<string, number> = {};

  const [partsRes, eventsRes] = await Promise.all([
    supabase
      .from("battle_participants")
      .select("session_id, display_name")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("score_events")
      .select("session_id")
      .in("session_id", sessionIds)
      .is("deleted_at", null),
  ]);

  for (const p of partsRes.data ?? []) {
    if (!participantNamesBySession[p.session_id]) {
      participantNamesBySession[p.session_id] = [];
    }
    participantNamesBySession[p.session_id].push(p.display_name);
  }
  for (const e of eventsRes.data ?? []) {
    eventCounts[e.session_id] = (eventCounts[e.session_id] ?? 0) + 1;
  }

  return mapSessionRowsToHistoryItems(
    rows,
    participantNamesBySession,
    eventCounts
  );
}

function mapSessionRowsToHistoryItems(
  rows: SessionRow[],
  participantNamesBySession: Record<string, string[]>,
  eventCounts: Record<string, number>
): ArenaHistoryItem[] {
  return rows.map((row) => {
    const names = participantNamesBySession[row.id] ?? [];
    return {
      id: row.id,
      game_name: row.game_name?.trim() || "—",
      session_date: row.session_date,
      started_at: row.started_at,
      ended_at: row.ended_at,
      status: row.status === "active" ? "active" : "ended",
      participant_count: names.length,
      participant_names: names,
      event_count: eventCounts[row.id] ?? 0,
    };
  });
}

export async function fetchActiveBattle(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, game_name, started_at, status, created_by")
    .eq("id", sessionId)
    .single();

  if (!session || session.created_by !== user.id) {
    return { error: "Сражение не найдено" as const };
  }
  if (session.status !== "active") {
    return { error: "Сражение уже завершено" as const };
  }

  const { data: parts } = await supabase
    .from("battle_participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!parts?.length) {
    return { error: "У сражения нет участников" as const };
  }

  return {
    id: session.id,
    game_name: session.game_name?.trim() || "Игра",
    started_at: session.started_at,
    participants: parts as BattleParticipant[],
  } satisfies ActiveBattleState;
}

async function fetchArenaBattlesPageForUser(
  supabase: SupabaseClient,
  userId: string,
  endedOffset: number,
  endedLimit: number
): Promise<ArenaBattlesPage | { error: string }> {
  const [{ data: activeRows }, { count: endedCount }, { data: endedRows }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, game_name, session_date, started_at, ended_at, status")
        .eq("created_by", userId)
        .eq("status", "active")
        .order("started_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("sessions")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId)
        .eq("status", "ended"),
      supabase
        .from("sessions")
        .select("id, game_name, session_date, started_at, ended_at, status")
        .eq("created_by", userId)
        .eq("status", "ended")
        .order("ended_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(endedOffset, endedOffset + endedLimit - 1),
    ]);

  const actives = (activeRows ?? []) as SessionRow[];
  const ended = (endedRows ?? []) as SessionRow[];
  const allRows = [...actives, ...ended];
  const battles = await enrichSessionRows(supabase, allRows);

  const totalEnded = endedCount ?? 0;
  const totalCount = actives.length + totalEnded;
  const nextEndedOffset = endedOffset + ended.length;

  return {
    battles,
    totalCount,
    endedOffset: nextEndedOffset,
    hasMore: nextEndedOffset < totalEnded,
  };
}

export async function fetchArenaState() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const page = await fetchArenaBattlesPageForUser(
    supabase,
    user.id,
    0,
    ARENA_BATTLES_PAGE_SIZE
  );
  if ("error" in page) return { error: page.error as "Не авторизован" };

  return {
    battles: page.battles,
    totalCount: page.totalCount,
    endedOffset: page.endedOffset,
    hasMore: page.hasMore,
  };
}

export async function fetchMoreArenaBattles(endedOffset: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const [{ count: endedCount }, { data: endedRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("status", "ended"),
    supabase
      .from("sessions")
      .select("id, game_name, session_date, started_at, ended_at, status")
      .eq("created_by", user.id)
      .eq("status", "ended")
      .order("ended_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(endedOffset, endedOffset + ARENA_BATTLES_PAGE_SIZE - 1),
  ]);

  const ended = (endedRows ?? []) as SessionRow[];
  const battles = await enrichSessionRows(supabase, ended);
  const totalEnded = endedCount ?? 0;
  const nextEndedOffset = endedOffset + ended.length;

  const { count: activeCount } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .eq("status", "active");

  return {
    battles,
    totalCount: (activeCount ?? 0) + totalEnded,
    endedOffset: nextEndedOffset,
    hasMore: nextEndedOffset < totalEnded,
  };
}

export type SeriesDetail = {
  game_name: string;
  participant_names: string[];
  battle_count: number;
  events: SessionScoreEvent[];
  actorNames: Record<string, string>;
  sessionIds: string[];
};

export async function fetchSeriesDetail(sessionIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" as const };

  const ids = [...new Set(sessionIds)].filter(Boolean);
  if (ids.length === 0) {
    return { error: "Нет сражений в серии" as const };
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, game_name, created_by")
    .in("id", ids);

  if (!sessions?.length || sessions.some((s) => s.created_by !== user.id)) {
    return { error: "Серия не найдена" as const };
  }

  const [{ data: participants }, { data: events }] = await Promise.all([
    supabase
      .from("battle_participants")
      .select("id, session_id, display_name")
      .in("session_id", ids)
      .order("created_at", { ascending: true }),
    supabase
      .from("score_events")
      .select(
        "id, session_id, winner_participant_id, participant_ids, created_at, created_by, deleted_at"
      )
      .in("session_id", ids)
      .order("created_at", { ascending: true }),
  ]);

  const nameByParticipantId: Record<string, string> = {};
  const nameSet = new Set<string>();
  for (const p of participants ?? []) {
    nameByParticipantId[p.id] = p.display_name;
    nameSet.add(p.display_name);
  }

  const participant_names = [...nameSet].sort((a, b) =>
    a.localeCompare(b, "ru")
  );

  const normalizedEvents = normalizeSeriesScoreEvents(
    events ?? [],
    nameByParticipantId
  );

  const actorIds = [
    ...new Set(
      (events ?? [])
        .map((e) => e.created_by)
        .filter((id): id is string => !!id)
    ),
  ];
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

  const game_name =
    sessions[0]?.game_name?.trim() || "—";

  return {
    game_name,
    participant_names,
    battle_count: ids.length,
    events: normalizedEvents,
    actorNames,
    sessionIds: ids,
  } satisfies SeriesDetail;
}

export async function startBattle(params: {
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

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      created_by: user.id,
      session_date: today,
      game_name: gameName,
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

  const { data: catalog } = await supabase
    .from("user_games")
    .select("id, name")
    .eq("user_id", user.id);
  const exists = (catalog ?? []).some(
    (g) => g.name.toLowerCase() === gameName.toLowerCase()
  );
  if (!exists) {
    const maxOrder = (catalog ?? []).length;
    await supabase.from("user_games").insert({
      user_id: user.id,
      name: gameName,
      sort_order: maxOrder + 1,
    });
  }

  revalidatePath("/");
  return { success: true, sessionId: session.id };
}

export async function endBattle(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, created_by")
    .eq("id", sessionId)
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

  revalidatePath("/");
  return { success: true };
}
