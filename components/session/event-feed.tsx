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
}

export function EventFeed({ leagueId, initialEvents, currentUserId }: EventFeedProps) {
  const [events, setEvents] = useState(initialEvents);

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
        () => {
          supabase
            .from("score_events")
            .select(
              `
              id, created_at, created_by, deleted_at,
              winner:league_members!winner_member_id(display_name),
              game:games(name)
            `
            )
            .eq("league_id", leagueId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(20)
            .then(({ data }) => {
              if (data) {
                setEvents(
                  data.map((e) => {
                    const winner = e.winner as { display_name: string } | { display_name: string }[] | null;
                    const game = e.game as { name: string } | { name: string }[] | null;
                    return {
                      id: e.id,
                      winner_name: Array.isArray(winner) ? winner[0]?.display_name : winner?.display_name ?? "?",
                      game_name: Array.isArray(game) ? game[0]?.name : game?.name ?? "?",
                      actor_name: "",
                      created_at: e.created_at,
                      created_by: e.created_by,
                    };
                  })
                );
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId]);

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
