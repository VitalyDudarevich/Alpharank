"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, Pencil, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useLeague } from "@/lib/league-context";
import { createClient } from "@/lib/supabase/client";
import { deleteLeague, updateLeagueName } from "@/lib/actions/league";
import { addGameByName, deleteGame } from "@/lib/actions/games";
import {
  continueLeague,
  fetchLeagueWinTotals,
  saveLeagueSeasonSettings,
} from "@/lib/actions/season";
import {
  buildStandings,
  formatSeasonEndDate,
  isLeagueConcluded,
} from "@/lib/league-season";
import { LeagueStandings } from "@/components/league/league-standings";
import { LeagueGamesSection } from "@/components/league/league-games-section";
import { DeleteLeagueDialog } from "@/components/league/delete-league-dialog";
import { CopyInviteButton } from "@/components/league/copy-invite-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type StatRow = {
  member_id: string;
  display_name: string;
  wins: number;
};

type RecentEvent = {
  id: string;
  winner_name: string;
  game_name: string;
};

export function LeagueHomePageClient() {
  const router = useRouter();
  const { leagueId, league, members, games, currentMember } = useLeague();
  const isOwner = currentMember.role === "owner";

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(league.name);
  const [endsAtDraft, setEndsAtDraft] = useState(league.ends_at ?? "");
  const [targetWinsDraft, setTargetWinsDraft] = useState(
    league.target_wins != null ? String(league.target_wins) : ""
  );
  const [gameTargetWins, setGameTargetWins] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        games.map((g) => [
          g.id,
          g.target_wins != null ? String(g.target_wins) : "",
        ])
      )
  );
  const [statRows, setStatRows] = useState<StatRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [winTotals, setWinTotals] = useState<
    Awaited<ReturnType<typeof fetchLeagueWinTotals>> | null
  >(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setNameDraft(league.name);
    setEndsAtDraft(league.ends_at ?? "");
    setTargetWinsDraft(
      league.target_wins != null ? String(league.target_wins) : ""
    );
    setGameTargetWins(
      Object.fromEntries(
        games.map((g) => [
          g.id,
          g.target_wins != null ? String(g.target_wins) : "",
        ])
      )
    );
  }, [league, games]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [statsRes, eventsRes, totals] = await Promise.all([
        supabase.rpc("get_league_stats", { p_league_id: leagueId }),
        supabase
          .from("score_events")
          .select(
            `
            id,
            winner:league_members!winner_member_id(display_name),
            game:games(name)
          `
          )
          .eq("league_id", leagueId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(5),
        fetchLeagueWinTotals(leagueId),
      ]);

      if (cancelled) return;

      setStatRows((statsRes.data ?? []) as StatRow[]);
      setRecentEvents(
        eventsRes.data?.map((e) => {
          const winner = e.winner as
            | { display_name: string }
            | { display_name: string }[]
            | null;
          const game = e.game as
            | { name: string }
            | { name: string }[]
            | null;
          return {
            id: e.id,
            winner_name:
              (Array.isArray(winner) ? winner[0] : winner)?.display_name ?? "?",
            game_name: (Array.isArray(game) ? game[0] : game)?.name ?? "?",
          };
        }) ?? []
      );
      setWinTotals(totals);
      setLoadingStats(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const concluded =
    winTotals && isLeagueConcluded(league, winTotals.memberTotals);
  const standings =
    concluded && winTotals
      ? buildStandings(members, winTotals.memberTotals)
      : [];

  const startEdit = () => {
    setNameDraft(league.name);
    setEndsAtDraft(league.ends_at ?? "");
    setTargetWinsDraft(
      league.target_wins != null ? String(league.target_wins) : ""
    );
    setGameTargetWins(
      Object.fromEntries(
        games.map((g) => [
          g.id,
          g.target_wins != null ? String(g.target_wins) : "",
        ])
      )
    );
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = () => {
    if (!nameDraft.trim()) return;

    startTransition(async () => {
      const nameResult = await updateLeagueName(leagueId, nameDraft);
      if (nameResult.error) {
        toast.error(nameResult.error);
        return;
      }

      if (isOwner) {
        const seasonResult = await saveLeagueSeasonSettings(leagueId, {
          league: {
            ends_at: endsAtDraft.trim() || null,
            target_wins: targetWinsDraft.trim()
              ? parseInt(targetWinsDraft, 10)
              : null,
          },
          games: games.map((g) => ({
            id: g.id,
            ends_at: null,
            target_wins: gameTargetWins[g.id]?.trim()
              ? parseInt(gameTargetWins[g.id], 10)
              : null,
          })),
        });
        if (seasonResult.error) {
          toast.error(seasonResult.error);
          return;
        }
      }

      toast.success("Сохранено");
      setEditing(false);
      router.refresh();
      setWinTotals(await fetchLeagueWinTotals(leagueId));
    });
  };

  const handleContinue = () => {
    startTransition(async () => {
      const result = await continueLeague(leagueId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Лига продолжена — можно снова записывать результаты");
      router.refresh();
      setWinTotals(await fetchLeagueWinTotals(leagueId));
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteLeague(leagueId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Лига удалена");
      setDeleteOpen(false);
      router.push("/");
      router.refresh();
    });
  };

  const handleAddGame = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (games.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Такая игра уже есть");
      throw new Error("duplicate");
    }
    const result = await addGameByName(leagueId, trimmed);
    if ("error" in result && result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    router.refresh();
  };

  const handleDeleteGame = (gameId: string) => {
    startTransition(async () => {
      await deleteGame(leagueId, gameId);
      router.refresh();
    });
  };

  return (
    <main className="px-4 pt-6 pb-8">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-3">
          {editing && isOwner ? (
            <div className="min-w-0 flex-1 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-zinc-400">Название</span>
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-zinc-400">
                  Дата завершения
                </span>
                <Input
                  type="date"
                  value={endsAtDraft}
                  onChange={(e) => setEndsAtDraft(e.target.value)}
                  className="h-11"
                  disabled={pending}
                />
              </label>
            </div>
          ) : (
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{league.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                {league.year != null && <span>{league.year}</span>}
                {league.ends_at && (
                  <span>до {formatSeasonEndDate(league.ends_at)}</span>
                )}
                {league.elo_enabled && (
                  <Badge variant="muted">ELO</Badge>
                )}
              </div>
            </div>
          )}
          {isOwner && !editing && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1"
              onClick={startEdit}
            >
              <Pencil className="h-4 w-4" />
              Изменить
            </Button>
          )}
        </div>
      </header>

      {!editing && (
        <>
          <Link href={`/league/${leagueId}/today`} className="mb-6 block">
            <Card className="flex items-center gap-4 border-violet-600/30 bg-violet-600/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600">
                <Swords className="h-6 w-6 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-violet-200">Арена</p>
                <p className="text-sm text-zinc-400">
                  {format(new Date(), "d MMMM", { locale: ru })}
                </p>
              </div>
            </Card>
          </Link>

          {concluded && standings.length > 0 && (
            <div className="mb-6 space-y-3">
              <LeagueStandings standings={standings} />
              {isOwner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={pending}
                  onClick={handleContinue}
                >
                  Продолжить лигу
                </Button>
              )}
            </div>
          )}

          <section className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              Топ по победам
            </h2>
            <Card className="divide-y divide-zinc-800 p-0">
              {loadingStats ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">…</p>
              ) : statRows.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">
                  Пока нет побед
                </p>
              ) : (
                statRows.slice(0, 5).map((s, i) => (
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
                ))
              )}
            </Card>
          </section>

          {!loadingStats && recentEvents.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-medium text-zinc-400">
                Последние
              </h2>
              <ul className="space-y-2">
                {recentEvents.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-zinc-800 px-3 py-2 text-sm"
                  >
                    {e.winner_name}{" "}
                    <span className="text-zinc-500">— {e.game_name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link
            href={`/league/${leagueId}/members`}
            className="mb-6 flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 transition-colors hover:border-zinc-600"
          >
            <div>
              <p className="font-medium text-zinc-100">Участники</p>
              <p className="text-sm text-zinc-500">{members.length} человек</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-500" />
          </Link>

          {isOwner && (
            <CopyInviteButton token={league.invite_token} className="mb-6" />
          )}
        </>
      )}

      {editing && isOwner && (
        <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <label className="block text-xs text-zinc-500">
            Побед лидеру (всего)
            <Input
              type="number"
              min={1}
              placeholder="Не задано"
              value={targetWinsDraft}
              onChange={(e) => setTargetWinsDraft(e.target.value)}
              className="mt-1"
              disabled={pending}
            />
          </label>
        </div>
      )}

      {(editing || games.length > 0) && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Игры</h2>
          <LeagueGamesSection
            games={games.map((g) => ({
              id: g.id,
              name: g.name,
              targetWins: g.target_wins,
            }))}
            pending={pending}
            editable={editing && isOwner}
            allowAdd={editing && isOwner}
            excludeLeagueId={leagueId}
            emptyText="Игр пока нет"
            targetWinsValues={gameTargetWins}
            onTargetWinsChange={(gameId, value) =>
              setGameTargetWins((prev) => ({ ...prev, [gameId]: value }))
            }
            onAdd={({ name }) => handleAddGame(name)}
            onRemove={handleDeleteGame}
          />
        </section>
      )}

      {editing && isOwner && (
        <div className="mt-8 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={cancelEdit}
              disabled={pending}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="h-11 w-full"
              onClick={handleSave}
              disabled={pending}
            >
              Сохранить
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-red-900/60 text-red-400 hover:bg-red-950/40"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
          >
            Удалить лигу
          </Button>
        </div>
      )}

      <DeleteLeagueDialog
        open={deleteOpen}
        leagueName={league.name}
        pending={pending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
