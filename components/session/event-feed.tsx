"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { undoWin } from "@/lib/actions/score";
import { Trophy } from "lucide-react";

interface FeedEvent {
  id: string;
  winner_name: string;
  game_name: string;
  actor_name: string;
  created_at: string;
  created_by: string;
}

interface EventFeedProps {
  leagueId: string;
  initialEvents: FeedEvent[];
  currentUserId: string;
  memberNames: Record<string, string>;
  gameNames: Record<string, string>;
  filterGameId?: string;
}

export function EventFeed({
  leagueId,
  initialEvents,
  currentUserId,
  memberNames,
  gameNames,
  filterGameId,
}: EventFeedProps) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`score-events-${leagueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "score_events",
          filter: `league_id=eq.${leagueId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as {
              id: string;
              winner_member_id: string;
              game_id: string;
              created_by: string;
              created_at: string;
              deleted_at: string | null;
            };
            if (row.deleted_at) return;
            if (filterGameId && row.game_id !== filterGameId) return;
            setEvents((prev) => [
              {
                id: row.id,
                winner_name: memberNames[row.winner_member_id] ?? "?",
                game_name: gameNames[row.game_id] ?? "?",
                actor_name: "",
                created_at: row.created_at,
                created_by: row.created_by,
              },
              ...prev.filter((e) => e.id !== row.id),
            ].slice(0, 20));
            return;
          }

          if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as { id: string; deleted_at: string | null };
            if (row.deleted_at) {
              setEvents((prev) => prev.filter((e) => e.id !== row.id));
            }
            return;
          }

          // Fallback: полная перезагрузка только при необходимости
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setEvents((prev) => prev.filter((e) => e.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, memberNames, gameNames, filterGameId]);

  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-zinc-500">Пока нет побед сегодня</p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {event.winner_name}{" "}
                <span className="text-zinc-500">— {event.game_name}</span>
              </p>
              <p className="text-xs text-zinc-500">
                {formatDistanceToNow(new Date(event.created_at), {
                  addSuffix: true,
                  locale: ru,
                })}
              </p>
            </div>
          </div>
          {event.created_by === currentUserId && (
            <button
              type="button"
              onClick={() => undoWin(leagueId, event.id)}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Отмена
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
