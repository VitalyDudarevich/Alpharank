import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar, Trophy } from "lucide-react";
import { getLeagueContext } from "@/lib/league-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyInviteButton } from "@/components/league/copy-invite-button";

export default async function LeagueDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, league, members, games, currentMember } =
    await getLeagueContext(id);

  const { data: recentEvents } = await supabase
    .from("score_events")
    .select(
      `
      id, created_at,
      winner:league_members!winner_member_id(display_name),
      game:games(name)
    `
    )
    .eq("league_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  type StatRow = { member_id: string; display_name: string; wins: number; games_played: number };
  const { data: stats } = await supabase.rpc("get_league_stats", {
    p_league_id: id,
  });
  const statRows = (stats ?? []) as StatRow[];

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{league.name}</h1>
        {league.year && (
          <p className="text-sm text-zinc-500">{league.year}</p>
        )}
        {league.elo_enabled && (
          <Badge className="mt-2" variant="muted">
            ELO включён
          </Badge>
        )}
      </header>

      <Link href={`/league/${id}/today`} className="mb-6 block">
        <Card className="flex items-center gap-4 border-violet-600/30 bg-violet-600/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-violet-200">Сегодня</p>
            <p className="text-sm text-zinc-400">
              {format(new Date(), "d MMMM", { locale: ru })}
            </p>
          </div>
        </Card>
      </Link>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Топ по победам</h2>
        <Card className="divide-y divide-zinc-800 p-0">
          {statRows.slice(0, 5).map((s, i) => (
            <div
              key={s.member_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <span className="text-zinc-500">{i + 1}.</span>
                <span className="font-medium">{s.display_name}</span>
              </span>
              <span className="flex items-center gap-1 font-bold text-violet-400">
                <Trophy className="h-4 w-4" />
                {s.wins}
              </span>
            </div>
          ))}
          {statRows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              Пока нет побед
            </p>
          )}
        </Card>
      </section>

      {recentEvents && recentEvents.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Последние</h2>
          <ul className="space-y-2">
            {recentEvents.map((e) => {
              const winner = e.winner as { display_name: string } | { display_name: string }[] | null;
              const game = e.game as { name: string } | { name: string }[] | null;
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-zinc-800 px-3 py-2 text-sm"
                >
                  {(Array.isArray(winner) ? winner[0] : winner)?.display_name}{" "}
                  <span className="text-zinc-500">
                    — {(Array.isArray(game) ? game[0] : game)?.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {currentMember.role === "owner" && (
        <CopyInviteButton token={league.invite_token} />
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs text-zinc-500">
        <span>{members.length} игроков</span>
        <span>{games.length} игр</span>
      </div>
    </main>
  );
}
