import { getLeagueContext } from "@/lib/league-data";
import { StatsClient } from "@/components/stats/stats-client";
import type { ScoreEvent } from "@/lib/types";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, league, members, games } = await getLeagueContext(id);

  const { data: eventsRaw } = await supabase
    .from("score_events")
    .select(
      `
      id, league_id, session_id, game_id, winner_member_id,
      participant_ids, created_by, created_at, deleted_at,
      session:sessions(session_date)
    `
    )
    .eq("league_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const events: ScoreEvent[] =
    eventsRaw?.map((e) => ({
      id: e.id,
      league_id: e.league_id,
      session_id: e.session_id,
      game_id: e.game_id,
      winner_member_id: e.winner_member_id,
      participant_ids: e.participant_ids,
      created_by: e.created_by,
      created_at: e.created_at,
      deleted_at: e.deleted_at,
    })) ?? [];

  const { data: eloRatings } = await supabase
    .from("elo_ratings")
    .select("member_id, game_id, rating");

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Статистика</h1>
        <p className="text-sm text-zinc-400">1 победа = 1 очко</p>
      </header>

      <StatsClient
        events={events}
        members={members}
        games={games}
        eloEnabled={league.elo_enabled}
        eloRatings={
          eloRatings?.map((r) => ({
            member_id: r.member_id,
            game_id: r.game_id,
            rating: Number(r.rating),
          })) ?? []
        }
      />
    </main>
  );
}
