"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeSessionPlayerStats,
  type SessionScoreEvent,
} from "@/lib/session-stats";

function mapScoreRows(
  rows: {
    id: string;
    winner_participant_id: string;
    participant_ids: string[];
    created_at: string;
    created_by: string | null;
    deleted_at: string | null;
  }[]
): SessionScoreEvent[] {
  return rows.map((e) => ({
    id: e.id,
    winner_member_id: null,
    winner_participant_id: e.winner_participant_id,
    participant_ids: e.participant_ids,
    game_id: null,
    created_at: e.created_at,
    created_by: e.created_by ?? "",
    deleted_at: e.deleted_at,
  }));
}

async function fetchScoreEvents(
  sessionId: string
): Promise<SessionScoreEvent[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("score_events")
    .select(
      "id, winner_participant_id, participant_ids, created_at, created_by, deleted_at"
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return null;
  return mapScoreRows(data ?? []);
}

export function useSessionScoreEvents({
  sessionId,
  participantIds,
  initialEvents = [],
}: {
  sessionId: string;
  participantIds: string[];
  initialEvents?: SessionScoreEvent[];
}) {
  const [events, setEvents] = useState<SessionScoreEvent[]>(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    void (async () => {
      const rows = await fetchScoreEvents(sessionId);
      if (cancelled || !rows) return;
      setEvents(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  /** Принудительно перечитать события счёта (pull-to-refresh). */
  const reload = useCallback(async () => {
    if (!sessionId) return;
    const rows = await fetchScoreEvents(sessionId);
    if (rows) setEvents(rows);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`session-scores-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "score_events",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as SessionScoreEvent;
            setEvents((prev) => {
              if (prev.some((e) => e.id === row.id)) {
                return prev.map((e) => (e.id === row.id ? row : e));
              }
              return [...prev, row];
            });
            return;
          }

          if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as SessionScoreEvent;
            setEvents((prev) =>
              prev.map((e) => (e.id === row.id ? row : e))
            );
            return;
          }

          if (payload.eventType === "DELETE" && payload.old) {
            const old = payload.old as { id: string };
            setEvents((prev) => prev.filter((e) => e.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const appendEvent = useCallback((event: SessionScoreEvent) => {
    setEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [...prev, event];
    });
  }, []);

  const markEventDeleted = useCallback((eventId: string) => {
    const deletedAt = new Date().toISOString();
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, deleted_at: deletedAt } : e))
    );
  }, []);

  const playerStats = useMemo(
    () => computeSessionPlayerStats(events, participantIds),
    [events, participantIds]
  );

  return { events, playerStats, appendEvent, markEventDeleted, reload };
}
