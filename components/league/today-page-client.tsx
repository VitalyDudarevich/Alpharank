"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLeague } from "@/lib/league-context";
import { fetchArenaState, type ArenaHistoryItem } from "@/lib/actions/arena";
import { fetchLeagueWinTotals } from "@/lib/actions/season";
import type { GameWinTotals, MemberWinTotals } from "@/lib/league-season";
import { ActiveBattleView } from "@/components/session/active-battle-view";
import { BattleSetupDialog } from "@/components/session/battle-setup-dialog";
import { BattleHistoryPanel } from "@/components/session/battle-history-panel";
import { BattleSessionDetail } from "@/components/session/battle-session-detail";
import { Button } from "@/components/ui/button";
import type { SessionLogEvent } from "@/components/session/session-event-log";
import type { Game, LeagueMember } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type ViewMode = "idle" | "active" | "history" | "history-detail";

export function TodayPageClient() {
  const { leagueId, league, members, games, userId } = useLeague();
  const totalsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("idle");
  const [history, setHistory] = useState<ArenaHistoryItem[]>([]);
  const [suggestedMemberIds, setSuggestedMemberIds] = useState<string[]>([]);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [battleMembers, setBattleMembers] = useState<LeagueMember[]>([]);
  const [sessionScoreEvents, setSessionScoreEvents] = useState<SessionScoreEvent[]>(
    []
  );
  const [logEvents, setLogEvents] = useState<SessionLogEvent[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [memberTotals, setMemberTotals] = useState<MemberWinTotals>({});
  const [gameTotals, setGameTotals] = useState<GameWinTotals>({});

  const loadSessionEvents = useCallback(
    async (sid: string, gameId: string, battleMembersList: LeagueMember[]) => {
      const supabase = createClient();
      const { data: events } = await supabase
        .from("score_events")
        .select(
          `
          id, winner_member_id, participant_ids, game_id, created_at, created_by, deleted_at,
          winner:league_members!winner_member_id(display_name)
        `
        )
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      const memberNames = Object.fromEntries(
        battleMembersList.map((m) => [m.id, m.display_name])
      );

      const actorIds = [
        ...new Set((events ?? []).map((e) => e.created_by)),
      ];
      const names: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", actorIds);
        for (const p of profiles ?? []) {
          names[p.id] = p.display_name;
        }
      }
      setActorNames(names);

      const scoreEvents: SessionScoreEvent[] = (events ?? []).map((e) => ({
        id: e.id,
        winner_member_id: e.winner_member_id,
        participant_ids: e.participant_ids,
        game_id: e.game_id,
        created_at: e.created_at,
        created_by: e.created_by,
        deleted_at: e.deleted_at,
      }));
      setSessionScoreEvents(scoreEvents);

      setLogEvents(
        (events ?? [])
          .filter((e) => !e.deleted_at && e.game_id === gameId)
          .map((e) => {
            const winner = e.winner as
              | { display_name: string }
              | { display_name: string }[]
              | null;
            const wName =
              (Array.isArray(winner) ? winner[0] : winner)?.display_name ??
              memberNames[e.winner_member_id] ??
              "?";
            return {
              id: e.id,
              winner_member_id: e.winner_member_id,
              winner_name: wName,
              actor_name: names[e.created_by] ?? "Участник",
              created_by: e.created_by,
              created_at: e.created_at,
              deleted_at: e.deleted_at,
            };
          })
          .reverse()
      );
    },
    []
  );

  const reloadArena = useCallback(async () => {
    const [arena, totals] = await Promise.all([
      fetchArenaState(leagueId),
      fetchLeagueWinTotals(leagueId),
    ]);

    if ("error" in arena) {
      setReady(true);
      return;
    }

    setHistory(arena.history);
    setSuggestedMemberIds(arena.suggestedMemberIds);
    setMemberTotals(totals.memberTotals);
    setGameTotals(totals.gameTotals);

    if (arena.activeSession && arena.activeGame) {
      const sid = arena.activeSession.id;
      const memberList = members.filter((m) =>
        arena.participantIds.includes(m.id)
      );
      setSessionId(sid);
      setActiveGame(arena.activeGame);
      setBattleMembers(memberList);
      setStartedAt(arena.activeSession.started_at ?? null);
      setView("active");
      await loadSessionEvents(sid, arena.activeGame.id, memberList);
    } else {
      setView((v) => (v === "history-detail" ? v : "idle"));
    }

    setReady(true);
  }, [leagueId, members, loadSessionEvents]);

  useEffect(() => {
    setReady(false);
    void reloadArena();
  }, [reloadArena]);

  const refreshTotals = useCallback(() => {
    if (totalsTimerRef.current) clearTimeout(totalsTimerRef.current);
    totalsTimerRef.current = setTimeout(() => {
      void fetchLeagueWinTotals(leagueId).then((totals) => {
        setMemberTotals(totals.memberTotals);
        setGameTotals(totals.gameTotals);
      });
    }, 1500);
  }, [leagueId]);

  useEffect(() => {
    return () => {
      if (totalsTimerRef.current) clearTimeout(totalsTimerRef.current);
    };
  }, []);

  if (!ready) {
    return (
      <main className="px-4 pt-6">
        <header className="mb-6 text-center">
          <h1 className="text-xl font-bold">{league.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">Загрузка…</p>
        </header>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6 pb-8">
      <header className="mb-6 grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-2">
        <div className="flex justify-start">
          {view === "history" && (
            <button
              type="button"
              onClick={() => setView("idle")}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Назад
            </button>
          )}
        </div>
        <h1 className="truncate text-center text-xl font-bold">{league.name}</h1>
        <div className="flex justify-end">
          {view === "idle" && (
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={() => setSetupOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Сражение
            </Button>
          )}
        </div>
      </header>

      {view === "active" && activeGame && sessionId && (
        <ActiveBattleView
          leagueId={leagueId}
          league={league}
          sessionId={sessionId}
          game={activeGame}
          members={battleMembers}
          sessionScoreEvents={sessionScoreEvents}
          logEvents={logEvents}
          actorNames={actorNames}
          currentUserId={userId}
          memberTotals={memberTotals}
          gameTotals={gameTotals}
          eloEnabled={league.elo_enabled}
          eloK={league.elo_k}
          startedAt={startedAt}
          onEnded={() => {
            setView("idle");
            void reloadArena();
          }}
          onTotalsRefresh={refreshTotals}
        />
      )}

      {view === "idle" && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
            <Swords className="mx-auto mb-4 h-12 w-12 text-violet-400/60" />
            <p className="mb-2 font-medium text-zinc-200">Нет активного сражения</p>
            <p className="mb-6 text-sm text-zinc-500">
              Выберите лигу, игру и участников, затем начните учёт очков
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full max-w-xs"
              onClick={() => setSetupOpen(true)}
            >
              Создать сражение
            </Button>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-400">История</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setView("history")}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Все
                </button>
              )}
            </div>
            <BattleHistoryPanel
              history={history.slice(0, 5)}
              onSelect={(id) => {
                setHistorySessionId(id);
                setView("history-detail");
              }}
            />
          </section>
        </div>
      )}

      {view === "history" && (
        <BattleHistoryPanel
          history={history}
          onSelect={(id) => {
            setHistorySessionId(id);
            setView("history-detail");
          }}
        />
      )}

      {view === "history-detail" && historySessionId && (
        <BattleSessionDetail
          leagueId={leagueId}
          sessionId={historySessionId}
          currentUserId={userId}
          onBack={() => {
            setHistorySessionId(null);
            setView(history.length > 5 ? "history" : "idle");
          }}
        />
      )}

      <BattleSetupDialog
        open={setupOpen}
        league={league}
        games={games}
        members={members}
        suggestedMemberIds={suggestedMemberIds}
        onClose={() => setSetupOpen(false)}
        onStarted={() => {
          void reloadArena();
        }}
      />
    </main>
  );
}
