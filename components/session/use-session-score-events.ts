"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeSessionPlayerStats,
  type SessionScoreEvent,
} from "@/lib/session-stats";

export function useSessionScoreEvents({
  leagueId,
  sessionId,
  participantIds,
  initialEvents = [],
}: {
  leagueId: string;
  sessionId: string;
  participantIds: string[];
  initialEvents?: SessionScoreEvent[];
}) {
  const [events, setEvents] = useState<SessionScoreEvent[]>(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
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

  const removeEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }, []);

  const playerStats = useMemo(
    () => computeSessionPlayerStats(events, participantIds),
    [events, participantIds]
  );

  return { events, playerStats, appendEvent, removeEvent };
}
