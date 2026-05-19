"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { undoWin } from "@/lib/actions/score";
import { toast } from "sonner";
import { RotateCcw, Trophy } from "lucide-react";
import type { SessionScoreEvent } from "@/lib/session-stats";

export type SessionLogEvent = {
  id: string;
  winner_member_id: string;
  winner_name: string;
  actor_name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
};

type SessionEventLogProps = {
  leagueId: string;
  sessionId: string;
  gameId: string;
  initialEvents: SessionLogEvent[];
  memberNames: Record<string, string>;
  actorNames: Record<string, string>;
  currentUserId: string;
  readOnly?: boolean;
  onUndo?: () => void;
  onEventRemoved?: (eventId: string) => void;
};

export function SessionEventLog({
  leagueId,
  sessionId,
  gameId,
  initialEvents,
  memberNames,
  actorNames,
  currentUserId,
  readOnly = false,
  onUndo,
  onEventRemoved,
}: SessionEventLogProps) {
  const [events, setEvents] = useState(initialEvents);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setEvents((prev) => {
      const next = initialEvents.filter((e) => !e.deleted_at);
      if (
        prev.length === next.length &&
        prev.every((e, i) => e.id === next[i]?.id)
      ) {
        return prev;
      }
      return next;
    });
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session-events-${sessionId}`)
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
            if (row.deleted_at || row.game_id !== gameId) return;
            setEvents((prev) => {
              if (prev.some((e) => e.id === row.id)) return prev;
              const actor =
                row.created_by === currentUserId
                  ? actorNames[row.created_by] ?? "Вы"
                  : actorNames[row.created_by] ?? "Участник";
              return [
                {
                  id: row.id,
                  winner_member_id: row.winner_member_id,
                  winner_name: memberNames[row.winner_member_id] ?? "?",
                  actor_name: actor,
                  created_by: row.created_by,
                  created_at: row.created_at,
                  deleted_at: null,
                },
                ...prev,
              ];
            });
            return;
          }
          if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as { id: string; deleted_at: string | null };
            if (row.deleted_at) {
              setEvents((prev) => prev.filter((e) => e.id !== row.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, gameId, memberNames, actorNames, currentUserId]);

  const handleUndo = (eventId: string) => {
    if (readOnly || pending) return;
    startTransition(async () => {
      const result = await undoWin(leagueId, eventId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      onEventRemoved?.(eventId);
      toast.info("Действие отменено");
      onUndo?.();
    });
  };

  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">
        Пока нет записей очков
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
        >
          <div className="flex min-w-0 gap-2">
            <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-sm text-zinc-100">
                <span className="font-medium">{event.actor_name}</span>
                <span className="text-zinc-500"> добавил очко </span>
                <span className="font-medium text-violet-200">
                  {event.winner_name}
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                {format(new Date(event.created_at), "d MMM, HH:mm", {
                  locale: ru,
                })}
              </p>
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              disabled={pending}
              onClick={() => handleUndo(event.id)}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-40"
              title="Откатить"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Откат
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
