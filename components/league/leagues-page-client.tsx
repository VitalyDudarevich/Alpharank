"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { NewLeagueForm } from "@/components/league/new-league-form";
import { writeLastLeagueId } from "@/lib/last-league";
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
import { LeagueMembersBlock } from "@/components/league/league-members-block";
import { LeagueGamesSection } from "@/components/league/league-games-section";
import { DeleteLeagueDialog } from "@/components/league/delete-league-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Game, LeagueMember, MemberRole } from "@/lib/types";

type UserLeague = {
  id: string;
  name: string;
  year: number | null;
};

type LeagueDetails = {
  name: string;
  year: number | null;
  invite_token: string;
  ends_at: string | null;
  target_wins: number | null;
  concluded_at: string | null;
  games: Game[];
  members: LeagueMember[];
  myRole: MemberRole;
};

type LeaguesPageClientProps = {
  userId: string;
  creatorDisplayName: string;
  initialCreate?: boolean;
};

export function LeaguesPageClient({
  userId,
  creatorDisplayName,
  initialCreate = false,
}: LeaguesPageClientProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(initialCreate);

  const [userLeagues, setUserLeagues] = useState<UserLeague[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [detailsCache, setDetailsCache] = useState<Record<string, LeagueDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [leagueEndsAt, setLeagueEndsAt] = useState<Record<string, string>>({});
  const [leagueTargetWins, setLeagueTargetWins] = useState<Record<string, string>>({});
  const [gameTargetWins, setGameTargetWins] = useState<
    Record<string, Record<string, string>>
  >({});
  const [winTotals, setWinTotals] = useState<
    Record<string, Awaited<ReturnType<typeof fetchLeagueWinTotals>>>
  >({});
  const [pending, startTransition] = useTransition();
  const [leagueToDelete, setLeagueToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("league_members")
      .select("leagues(id, name, year)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        const list =
          data
            ?.map((row) => {
              const l = row.leagues as UserLeague | UserLeague[] | null;
              return Array.isArray(l) ? l[0] : l;
            })
            .filter((l): l is UserLeague => !!l) ?? [];
        setUserLeagues(list);
        setLoadingLeagues(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadLeagueDetails = useCallback(
    async (id: string) => {
      setLoadingDetails((prev) => new Set(prev).add(id));
      const supabase = createClient();

      const [leagueRes, gamesRes, membersRes, myRes] = await Promise.all([
        supabase
          .from("leagues")
          .select("name, year, invite_token, ends_at, target_wins, concluded_at")
          .eq("id", id)
          .single(),
        supabase
          .from("games")
          .select("*")
          .eq("league_id", id)
          .order("sort_order"),
        supabase
          .from("league_members")
          .select("*")
          .eq("league_id", id)
          .order("display_name"),
        supabase
          .from("league_members")
          .select("role")
          .eq("league_id", id)
          .eq("user_id", userId)
          .single(),
      ]);

      if (leagueRes.data) {
        setDetailsCache((prev) => ({
          ...prev,
          [id]: {
            name: leagueRes.data.name,
            year: leagueRes.data.year,
            invite_token: leagueRes.data.invite_token,
            ends_at: leagueRes.data.ends_at,
            target_wins: leagueRes.data.target_wins,
            concluded_at: leagueRes.data.concluded_at,
            games: (gamesRes.data ?? []) as Game[],
            members: (membersRes.data ?? []) as LeagueMember[],
            myRole: (myRes.data?.role ?? "member") as MemberRole,
          },
        }));
      }

      setLoadingDetails((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [userId]
  );

  const loadWinTotals = useCallback(async (id: string) => {
    const totals = await fetchLeagueWinTotals(id);
    setWinTotals((prev) => ({ ...prev, [id]: totals }));
    return totals;
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (editingId === id) setEditingId(null);
      } else {
        next.add(id);
        writeLastLeagueId(id);
        void loadLeagueDetails(id);
        void loadWinTotals(id);
      }
      return next;
    });
  };

  const getDetails = (id: string): LeagueDetails | undefined => detailsCache[id];

  const handleSave = (id: string) => {
    const draft = nameDrafts[id];
    if (!draft?.trim()) return;
    const details = getDetails(id);
    if (!details) return;

    startTransition(async () => {
      const nameResult = await updateLeagueName(id, draft);
      if (nameResult.error) {
        toast.error(nameResult.error);
        return;
      }

      if (details.myRole === "owner") {
        const leagueTarget = leagueTargetWins[id]?.trim();
        const seasonResult = await saveLeagueSeasonSettings(id, {
          league: {
            ends_at: leagueEndsAt[id]?.trim() || null,
            target_wins: leagueTarget ? parseInt(leagueTarget, 10) : null,
          },
          games: details.games.map((g) => ({
            id: g.id,
            ends_at: null,
            target_wins: gameTargetWins[id]?.[g.id]?.trim()
              ? parseInt(gameTargetWins[id][g.id], 10)
              : null,
          })),
        });
        if (seasonResult.error) {
          toast.error(seasonResult.error);
          return;
        }
      }

      toast.success("Сохранено");
      setEditingId(null);
      await loadLeagueDetails(id);
      await loadWinTotals(id);
      router.refresh();
    });
  };

  const handleContinue = (id: string) => {
    startTransition(async () => {
      const result = await continueLeague(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Лига продолжена — можно снова записывать результаты");
      await loadLeagueDetails(id);
      await loadWinTotals(id);
      router.refresh();
    });
  };

  const confirmDeleteLeague = () => {
    if (!leagueToDelete) return;
    const { id } = leagueToDelete;

    startTransition(async () => {
      const result = await deleteLeague(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Лига удалена");
      setLeagueToDelete(null);
      setEditingId(null);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setUserLeagues((prev) => prev.filter((l) => l.id !== id));
      setDetailsCache((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      router.refresh();
    });
  };

  const handleAddGame = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const details = getDetails(id);
    if (!details) return;
    if (details.games.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Такая игра уже есть");
      throw new Error("duplicate");
    }
    const result = await addGameByName(id, trimmed);
    if ("error" in result && result.error) {
      toast.error(result.error);
      throw new Error(result.error);
    }
    await loadLeagueDetails(id);
  };

  const handleDeleteGame = (leagueIdTarget: string, gameId: string) => {
    startTransition(async () => {
      await deleteGame(leagueIdTarget, gameId);
      await loadLeagueDetails(leagueIdTarget);
    });
  };

  const handleLeagueCreated = (leagueId: string, name: string, year: number | null) => {
    setCreating(false);
    setUserLeagues((prev) => {
      if (prev.some((l) => l.id === leagueId)) return prev;
      return [{ id: leagueId, name, year }, ...prev];
    });
    setExpandedIds((prev) => new Set(prev).add(leagueId));
    writeLastLeagueId(leagueId);
    void loadLeagueDetails(leagueId);
    void loadWinTotals(leagueId);
    router.refresh();
  };

  const startEdit = (id: string, details: LeagueDetails) => {
    setNameDrafts((prev) => ({ ...prev, [id]: details.name }));
    setLeagueEndsAt((prev) => ({
      ...prev,
      [id]: details.ends_at ?? "",
    }));
    setLeagueTargetWins((prev) => ({
      ...prev,
      [id]: details.target_wins != null ? String(details.target_wins) : "",
    }));
    const gTargets: Record<string, string> = {};
    for (const g of details.games) {
      gTargets[g.id] = g.target_wins != null ? String(g.target_wins) : "";
    }
    setGameTargetWins((prev) => ({ ...prev, [id]: gTargets }));
    setEditingId(id);
  };

  const cancelEdit = (id: string, name: string) => {
    setNameDrafts((prev) => ({ ...prev, [id]: name }));
    setEditingId(null);
  };

  return (
    <>
      <AppPageHeader title="Лиги" titleClassName="text-2xl" />
      <p className="-mt-4 mb-6 text-center text-sm text-zinc-500">
        Условия долгосрочной игры: игры, сроки и лимит побед
      </p>

      {creating && (
        <div className="mb-6">
          <NewLeagueForm
            creatorDisplayName={creatorDisplayName}
            creatorUserId={userId}
            onCreated={handleLeagueCreated}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {loadingLeagues ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : userLeagues.length === 0 && !creating ? (
        <Card className="text-center text-sm text-zinc-400">
          <p>Пока нет лиг</p>
        </Card>
      ) : userLeagues.length > 0 ? (
        <ul className="space-y-2">
          {userLeagues.map((l) => {
            const expanded = expandedIds.has(l.id);
            const details = getDetails(l.id);
            const loading = loadingDetails.has(l.id);
            const editing = editingId === l.id;
            const isOwner = details?.myRole === "owner";
            const totals = winTotals[l.id];
            const leagueForSeason = details
              ? {
                  ends_at: details.ends_at,
                  target_wins: details.target_wins,
                  concluded_at: details.concluded_at,
                }
              : null;
            const concluded =
              leagueForSeason &&
              totals &&
              isLeagueConcluded(leagueForSeason, totals.memberTotals);
            const standings =
              concluded && details
                ? buildStandings(details.members, totals!.memberTotals)
                : [];
            return (
              <li key={l.id}>
                <Card
                  className={cn(
                    "overflow-hidden p-0 transition-colors",
                    expanded && "border-violet-500/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(l.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-100">
                        {details?.name ?? l.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                        {(details?.year ?? l.year) != null && (
                          <span>{details?.year ?? l.year}</span>
                        )}
                        {details?.ends_at && (
                          <span>до {formatSeasonEndDate(details.ends_at)}</span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-zinc-500 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
                      {loading && !details ? (
                        <p className="py-4 text-center text-sm text-zinc-500">
                          Загрузка…
                        </p>
                      ) : details ? (
                        <>
                          <div className="mb-4 flex items-center justify-between gap-2">
                            {editing && isOwner ? (
                              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                                <label className="min-w-0 flex-1">
                                    <span className="mb-1 block text-sm text-zinc-400">
                                      Название
                                    </span>
                                    <Input
                                      value={nameDrafts[l.id] ?? details.name}
                                      onChange={(e) =>
                                        setNameDrafts((prev) => ({
                                          ...prev,
                                          [l.id]: e.target.value,
                                        }))
                                      }
                                      disabled={pending}
                                      placeholder="Лига 2026"
                                    />
                                  </label>
                                  <label className="w-full shrink-0 sm:w-[11.5rem]">
                                    <span className="mb-1 block text-sm text-zinc-400">
                                      Дата завершения
                                    </span>
                                    <Input
                                      type="date"
                                      value={leagueEndsAt[l.id] ?? ""}
                                      onChange={(e) =>
                                        setLeagueEndsAt((prev) => ({
                                          ...prev,
                                          [l.id]: e.target.value,
                                        }))
                                      }
                                      className="h-11"
                                      disabled={pending}
                                    />
                                  </label>
                              </div>
                            ) : null}
                            {isOwner && !editing && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-auto shrink-0 gap-1"
                                onClick={() => startEdit(l.id, details)}
                              >
                                <Pencil className="h-4 w-4" />
                                Редактировать
                              </Button>
                            )}
                          </div>

                          {concluded && standings.length > 0 && (
                            <div className="mb-5 space-y-3">
                              <LeagueStandings standings={standings} />
                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  disabled={pending}
                                  onClick={() => handleContinue(l.id)}
                                >
                                  Продолжить лигу
                                </Button>
                              )}
                            </div>
                          )}

                          {editing && isOwner && (
                            <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                              <label className="block text-xs text-zinc-500">
                                Побед лидеру (всего)
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Не задано"
                                  value={leagueTargetWins[l.id] ?? ""}
                                  onChange={(e) =>
                                    setLeagueTargetWins((prev) => ({
                                      ...prev,
                                      [l.id]: e.target.value,
                                    }))
                                  }
                                  className="mt-1"
                                  disabled={pending}
                                />
                              </label>
                              <p className="mt-2 text-xs text-zinc-600">
                                Дата окончания — в строке с названием.
                              </p>
                            </div>
                          )}

                          {!editing &&
                            details &&
                            details.target_wins != null &&
                            !concluded && (
                              <p className="mb-4 text-xs text-zinc-500">
                                до {details.target_wins} побед лидеру
                              </p>
                            )}

                          <div className="mb-5">
                            <LeagueGamesSection
                              games={details.games.map((game) => ({
                                id: game.id,
                                name: game.name,
                                targetWins: game.target_wins,
                              }))}
                              pending={pending}
                              editable={editing && isOwner}
                              allowAdd={editing && isOwner}
                              excludeLeagueId={l.id}
                              emptyText="Игр пока нет"
                              targetWinsValues={gameTargetWins[l.id]}
                              onTargetWinsChange={(gameId, value) =>
                                setGameTargetWins((prev) => ({
                                  ...prev,
                                  [l.id]: {
                                    ...(prev[l.id] ?? {}),
                                    [gameId]: value,
                                  },
                                }))
                              }
                              onAdd={async ({ name }) => {
                                await handleAddGame(l.id, name);
                              }}
                              onRemove={(gameId) =>
                                handleDeleteGame(l.id, gameId)
                              }
                            />
                          </div>

                          <div>
                            <LeagueMembersBlock
                              members={details.members.map((m) => ({
                                id: m.id,
                                user_id: m.user_id,
                                display_name: m.display_name,
                                role: m.role,
                              }))}
                              inviteToken={details.invite_token}
                              leagueName={details.name}
                              leagueId={l.id}
                              allowAdd={editing && isOwner}
                              addDisabled={pending}
                              pending={pending}
                              onMemberAdded={(member) => {
                                setDetailsCache((prev) => {
                                  const d = prev[l.id];
                                  if (!d) return prev;
                                  return {
                                    ...prev,
                                    [l.id]: {
                                      ...d,
                                      members: [
                                        ...d.members,
                                        {
                                          id: member.id!,
                                          league_id: l.id,
                                          user_id: member.user_id!,
                                          display_name: member.display_name,
                                          role: member.role,
                                          created_at: new Date().toISOString(),
                                        },
                                      ],
                                    },
                                  };
                                });
                              }}
                            />
                          </div>

                          {editing && isOwner && (
                            <div className="mt-8 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-11 w-full min-w-0"
                                  onClick={() => cancelEdit(l.id, details.name)}
                                  disabled={pending}
                                >
                                  Отмена
                                </Button>
                                <Button
                                  type="button"
                                  className="h-11 w-full min-w-0"
                                  onClick={() => handleSave(l.id)}
                                  disabled={pending}
                                >
                                  Сохранить
                                </Button>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full border-red-900/60 text-red-400 hover:bg-red-950/40 hover:text-red-300"
                                disabled={pending}
                                onClick={() =>
                                  setLeagueToDelete({
                                    id: l.id,
                                    name: details.name,
                                  })
                                }
                              >
                                Удалить лигу
                              </Button>
                            </div>
                          )}

                        </>
                      ) : null}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!creating && (
        <div className="mt-6">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            onClick={() => setCreating(true)}
          >
            <Plus className="h-5 w-5" />
            Новая лига
          </Button>
        </div>
      )}

      <DeleteLeagueDialog
        open={leagueToDelete != null}
        leagueName={leagueToDelete?.name ?? ""}
        pending={pending}
        onClose={() => setLeagueToDelete(null)}
        onConfirm={confirmDeleteLeague}
      />
    </>
  );
}
