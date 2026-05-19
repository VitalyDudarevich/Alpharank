import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getLeagueContext } from "@/lib/league-data";
import { getOrCreateTodaySession } from "@/lib/actions/score";
import { TodayClient } from "@/components/session/today-client";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, league, members, games } = await getLeagueContext(id);

  const session = await getOrCreateTodaySession(id);

  const { data: participants } = await supabase
    .from("session_participants")
    .select("member_id")
    .eq("session_id", session.id);

  const selectedIds = participants?.map((p) => p.member_id) ?? [];

  const today = new Date().toISOString().split("T")[0];

  const { data: todayEvents } = await supabase
    .from("score_events")
    .select("id, winner_member_id, created_at, created_by, game_id, deleted_at")
    .eq("session_id", session.id)
    .is("deleted_at", null);

  const winCounts: Record<string, number> = {};
  todayEvents?.forEach((e) => {
    winCounts[e.winner_member_id] = (winCounts[e.winner_member_id] ?? 0) + 1;
  });

  const { data: feedRaw } = await supabase
    .from("score_events")
    .select(
      `
      id, created_at, created_by, deleted_at,
      winner:league_members!winner_member_id(display_name),
      game:games(name)
    `
    )
    .eq("league_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const feedEvents =
    feedRaw?.map((e) => {
      const winner = e.winner as { display_name: string } | { display_name: string }[] | null;
      const game = e.game as { name: string } | { name: string }[] | null;
      return {
        id: e.id,
        winner_name: (Array.isArray(winner) ? winner[0] : winner)?.display_name ?? "?",
        game_name: (Array.isArray(game) ? game[0] : game)?.name ?? "?",
        actor_name: "",
        created_at: e.created_at,
        created_by: e.created_by,
      };
    }) ?? [];

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Сегодня</h1>
        <p className="text-sm text-zinc-400">
          {format(new Date(session.session_date), "d MMMM yyyy", { locale: ru })}
        </p>
      </header>

      <TodayClient
        leagueId={id}
        sessionId={session.id}
        games={games}
        allMembers={members}
        selectedParticipantIds={selectedIds}
        winCounts={winCounts}
        feedEvents={feedEvents}
        currentUserId={user.id}
      />
    </main>
  );
}
