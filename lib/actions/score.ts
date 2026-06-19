"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUndoScoreEvent } from "@/lib/score-undo";

export async function addWin(params: {
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
    .single();

  if (!session) {
    return { error: "Сражение не найдено" };
  }
  if (session.status !== "active") {
    return { error: "Сражение завершено" };
  }

  const { data: event, error } = await supabase
    .from("score_events")
    .insert({
      session_id: sessionId,
      winner_participant_id: winnerParticipantId,
      participant_ids: participantIds,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Ошибка записи" };

  after(() => {
    console.info("win recorded", {
      event_id: event.id,
      winner: winnerDisplayName,
      game: gameName,
    });
  });

  revalidatePath("/");
  revalidatePath("/stats");
  return { success: true, eventId: event.id };
}

export async function addRoundPlacements(params: {
  sessionId: string;
  /** { participant_id: место } для всех участников раунда. */
  placements: Record<string, number>;
  participantIds: string[];
  gameName: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { sessionId, placements, participantIds } = params;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, scoring_mode, participant_slots")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Сражение не найдено" };
  if (session.status !== "active") return { error: "Сражение завершено" };
  if (session.scoring_mode !== "smart") {
    return { error: "Сражение не в умном режиме" };
  }

  const slots = session.participant_slots ?? participantIds.length;
  const entries = Object.entries(placements);

  // У всех участников должно быть выбрано место.
  if (entries.length !== participantIds.length) {
    return { error: "Укажите место для всех участников" };
  }
  for (const [pid, place] of entries) {
    if (!participantIds.includes(pid)) {
      return { error: "Неизвестный участник в раунде" };
    }
    if (!Number.isInteger(place) || place < 1 || place > slots) {
      return { error: "Некорректное место" };
    }
  }
  // Места не должны повторяться.
  const places = entries.map(([, place]) => place);
  if (new Set(places).size !== places.length) {
    return { error: "Места не должны повторяться" };
  }

  // Победитель (для счёта побед) — участник с лучшим (наименьшим) местом.
  const winnerEntry = entries.reduce((best, cur) =>
    cur[1] < best[1] ? cur : best
  );

  const { data: event, error } = await supabase
    .from("score_events")
    .insert({
      session_id: sessionId,
      winner_participant_id: winnerEntry[0],
      participant_ids: participantIds,
      placements,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Ошибка записи" };

  revalidatePath("/");
  revalidatePath("/stats");
  return { success: true, eventId: event.id };
}

export async function undoWin(eventId: string) {
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

  if (!canUndoScoreEvent(event.created_by, event.created_at, user.id)) {
    return { error: "Откат недоступен (прошло больше 20 минут)" };
  }

  const { error } = await supabase
    .from("score_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/stats");
  return { success: true };
}
