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
