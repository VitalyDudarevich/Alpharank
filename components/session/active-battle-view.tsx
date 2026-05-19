"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, intervalToDuration } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endBattle } from "@/lib/actions/arena";
import { DeferredArenaWinsChart } from "./deferred-arena-wins-chart";
import { BattleScoreboard } from "./battle-scoreboard";
import { ParticipantPicker } from "./participant-picker";
import { SessionEventLog, type SessionLogEvent } from "./session-event-log";
import { useSessionScoreEvents } from "./use-session-score-events";
import { winCountsFromEvents } from "@/lib/arena-games";
import { LeagueSeasonBanner } from "./league-season-banner";
import {
  isGameLocked,
  isLeagueConcluded,
  type GameWinTotals,
  type MemberWinTotals,
} from "@/lib/league-season";
import type { Game, League, LeagueMember } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type ActiveBattleViewProps = {
  leagueId: string;
  league: League;
  sessionId: string;
  game: Game;
  members: LeagueMember[];
  allLeagueMembers: LeagueMember[];
  onParticipantsUpdated?: () => void;
  sessionScoreEvents: SessionScoreEvent[];
  logEvents: SessionLogEvent[];
  actorNames: Record<string, string>;
  currentUserId: string;
  memberTotals: MemberWinTotals;
  gameTotals: GameWinTotals;
  eloEnabled: boolean;
  eloK: number;
  startedAt: string | null;
  onEnded: () => void;
  /** Лёгкое обновление итогов лиги (без перезагрузки страницы) */
  onTotalsRefresh?: () => void;
};

function formatBattleDuration(ms: number): string {
  if (ms < 0) return "0 мин";
  const d = intervalToDuration({ start: 0, end: ms });
  const parts: string[] = [];
  if (d.hours) parts.push(`${d.hours} ч`);
  if (d.minutes) parts.push(`${d.minutes} мин`);
  if (!d.hours && !d.minutes && d.seconds) parts.push(`${d.seconds} сек`);
  return parts.join(" ") || "0 мин";
}

function pluralPlayers(n: number) {
  if (n === 1) return "игрок";
  if (n >= 2 && n <= 4) return "игрока";
  return "игроков";
}

function pluralRounds(n: number) {
  if (n === 1) return "игра";
  if (n >= 2 && n <= 4) return "игры";
  return "игр";
}

export function ActiveBattleView({
  leagueId,
  league,
  sessionId,
  game,
  members,
  allLeagueMembers,
  onParticipantsUpdated,
  sessionScoreEvents,
  logEvents,
  actorNames,
  currentUserId,
  memberTotals,
  gameTotals,
  eloEnabled,
  eloK,
  startedAt,
  onEnded,
  onTotalsRefresh,
}: ActiveBattleViewProps) {
  const [ending, startEndTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const memberIds = members.map((m) => m.id);
  const canScore = memberIds.length >= 2;

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const { events: sessionEvents, appendEvent, removeEvent } =
    useSessionScoreEvents({
      leagueId,
      sessionId,
      participantIds: memberIds,
      initialEvents: sessionScoreEvents,
    });

  const winCounts = useMemo(
    () => winCountsFromEvents(sessionEvents, game.id),
    [sessionEvents, game.id]
  );

  const memberNames = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.display_name])),
    [members]
  );

  const leagueConcluded = isLeagueConcluded(league, memberTotals);
  const gameLocked = isGameLocked(
    game,
    gameTotals[game.id] ?? 0,
    leagueConcluded
  );
  const scoringDisabled = leagueConcluded || gameLocked;

  const roundsPlayed = useMemo(
    () =>
      sessionEvents.filter((e) => !e.deleted_at && e.game_id === game.id).length,
    [sessionEvents, game.id]
  );

  const durationMs = startedAt
    ? now - new Date(startedAt).getTime()
    : 0;

  const handleEnd = () => {
    startEndTransition(async () => {
      const result = await endBattle(leagueId, sessionId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Сражение завершено");
      onEnded();
    });
  };

  return (
    <div className="space-y-6">
      <LeagueSeasonBanner
        league={league}
        games={[game]}
        members={members}
        memberTotals={memberTotals}
        gameTotals={gameTotals}
        activeGameId={game.id}
      />

      <div className="rounded-2xl border border-violet-500/40 bg-violet-600/10 px-4 py-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-violet-50 sm:text-3xl">
          {game.name}
        </h2>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-violet-300/90">
          {startedAt && (
            <>
              <li>
                Начало{" "}
                <span className="font-medium text-violet-100">
                  {format(new Date(startedAt), "HH:mm", { locale: ru })}
                </span>
              </li>
              <li className="text-violet-500/50" aria-hidden>
                ·
              </li>
              <li>{formatBattleDuration(durationMs)}</li>
              <li className="text-violet-500/50" aria-hidden>
                ·
              </li>
            </>
          )}
          <li>
            {members.length} {pluralPlayers(members.length)}
          </li>
          <li className="text-violet-500/50" aria-hidden>
            ·
          </li>
          <li>
            {roundsPlayed} {pluralRounds(roundsPlayed)}
          </li>
        </ul>
      </div>

      {!canScore ? (
        <section className="space-y-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
          <p className="text-sm text-zinc-400">
            {allLeagueMembers.length === 0
              ? "В лиге пока нет участников. Добавьте людей на странице «Участники», затем выберите их для учёта очков."
              : "Выберите минимум двух участников сражения, чтобы вести счёт."}
          </p>
          {allLeagueMembers.length > 0 && (
            <ParticipantPicker
              leagueId={leagueId}
              sessionId={sessionId}
              allMembers={allLeagueMembers}
              selectedIds={memberIds}
              onSelectionChange={() => onParticipantsUpdated?.()}
              gameId={game.id}
              gameName={game.name}
              winCounts={winCounts}
              eloEnabled={eloEnabled}
              eloK={eloK}
              winsDisabled={scoringDisabled}
              embedded
              onWinRecorded={() => onTotalsRefresh?.()}
            />
          )}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-400">Очки</h2>
          </div>
          <BattleScoreboard
            leagueId={leagueId}
            sessionId={sessionId}
            gameId={game.id}
            gameName={game.name}
            members={members}
            participantIds={memberIds}
            winCounts={winCounts}
            eloEnabled={eloEnabled}
            eloK={eloK}
            disabled={scoringDisabled}
            onWinRecorded={onTotalsRefresh}
            onEventAdded={appendEvent}
          />
        </section>
      )}

      {scoringDisabled && canScore && (
        <p className="text-center text-sm text-amber-400/90">
          Запись очков недоступна: лига или игра завершены
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">График</h2>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
          <DeferredArenaWinsChart
            events={sessionEvents}
            memberNames={memberNames}
            memberIds={memberIds}
            gameId={game.id}
          />
        </div>
      </section>

      <Button
        type="button"
        variant="outline"
        className="h-12 w-full border-zinc-600 text-zinc-200"
        disabled={ending}
        onClick={handleEnd}
      >
        {ending ? "Завершение…" : "Завершить сражение"}
      </Button>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">
          Журнал действий
        </h2>
        <SessionEventLog
          leagueId={leagueId}
          sessionId={sessionId}
          gameId={game.id}
          initialEvents={logEvents}
          memberNames={memberNames}
          actorNames={actorNames}
          currentUserId={currentUserId}
          onUndo={() => {
            onTotalsRefresh?.();
          }}
          onEventRemoved={removeEvent}
        />
      </section>
    </div>
  );
}
