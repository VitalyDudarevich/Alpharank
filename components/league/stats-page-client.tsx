"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLeague } from "@/lib/league-context";
import { StatsClient } from "@/components/stats/stats-client";
import type { ScoreEvent } from "@/lib/types";

export function StatsPageClient() {
  const { leagueId, league, members, games } = useLeague();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [eloRatings, setEloRatings] = useState<
    { member_id: string; game_id: string | null; rating: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [eventsRes, eloRes] = await Promise.all([
        supabase
          .from("score_events")
          .select(
            `
            id, league_id, session_id, game_id, winner_member_id,
            participant_ids, created_by, created_at, deleted_at
          `
          )
          .eq("league_id", leagueId)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
        supabase.from("elo_ratings").select("member_id, game_id, rating"),
      ]);

      if (cancelled) return;

      setEvents(
        (eventsRes.data ?? []).map((e) => ({
          id: e.id,
          league_id: e.league_id,
          session_id: e.session_id,
          game_id: e.game_id,
          winner_member_id: e.winner_member_id,
          participant_ids: e.participant_ids,
          created_by: e.created_by,
          created_at: e.created_at,
          deleted_at: e.deleted_at,
        }))
      );

      setEloRatings(
        eloRes.data?.map((r) => ({
          member_id: r.member_id,
          game_id: r.game_id,
          rating: Number(r.rating),
        })) ?? []
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Статистика</h1>
        <p className="text-sm text-zinc-400">1 победа = 1 очко</p>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : (
        <StatsClient
          events={events}
          members={members}
          games={games}
          eloEnabled={league.elo_enabled}
          eloRatings={eloRatings}
        />
      )}
    </main>
  );
}
