"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, intervalToDuration } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endStandaloneBattle } from "@/lib/actions/standalone-arena";
import { DeferredArenaWinsChart } from "./deferred-arena-wins-chart";
import { StandaloneBattleScoreboard } from "./standalone-battle-scoreboard";
import { SessionEventLog, type SessionLogEvent } from "./session-event-log";
import { useSessionScoreEvents } from "./use-session-score-events";
import { winCountsFromEvents } from "@/lib/arena-games";
import type { BattleParticipant } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type StandaloneActiveBattleViewProps = {
  sessionId: string;
  gameName: string;
  participants: BattleParticipant[];
  sessionScoreEvents: SessionScoreEvent[];
  logEvents: SessionLogEvent[];
  actorNames: Record<string, string>;
  currentUserId: string;
  startedAt: string | null;
  onEnded: () => void;
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

export function StandaloneActiveBattleView({
  sessionId,
  gameName,
  participants,
  sessionScoreEvents,
  logEvents,
  actorNames,
  currentUserId,
  startedAt,
  onEnded,
}: StandaloneActiveBattleViewProps) {
  const [ending, startEndTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const participantIds = participants.map((p) => p.id);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const { events: sessionEvents, appendEvent, removeEvent } =
    useSessionScoreEvents({
      leagueId: "",
      sessionId,
      participantIds,
      initialEvents: sessionScoreEvents,
    });

  const winCounts = useMemo(
    () => winCountsFromEvents(sessionEvents, null),
    [sessionEvents]
  );

  const memberNames = useMemo(
    () =>
      Object.fromEntries(
        participants.map((p) => [p.id, p.display_name])
      ),
    [participants]
  );

  const roundsPlayed = useMemo(
    () => sessionEvents.filter((e) => !e.deleted_at).length,
    [sessionEvents]
  );

  const durationMs = startedAt
    ? now - new Date(startedAt).getTime()
    : 0;

  const handleEnd = () => {
    startEndTransition(async () => {
      const result = await endStandaloneBattle(sessionId);
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
      <div className="rounded-2xl border border-violet-500/40 bg-violet-600/10 px-4 py-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-violet-50 sm:text-3xl">
          {gameName}
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
            {participants.length} {pluralPlayers(participants.length)}
          </li>
          <li className="text-violet-500/50" aria-hidden>
            ·
          </li>
          <li>
            {roundsPlayed} {pluralRounds(roundsPlayed)}
          </li>
        </ul>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-400">Очки</h2>
        </div>
        <StandaloneBattleScoreboard
          sessionId={sessionId}
          gameName={gameName}
          participants={participants}
          winCounts={winCounts}
          onEventAdded={appendEvent}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">График</h2>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
          <DeferredArenaWinsChart
            events={sessionEvents}
            memberNames={memberNames}
            memberIds={participantIds}
            gameId={null}
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
          leagueId={null}
          sessionId={sessionId}
          gameId={null}
          initialEvents={logEvents.map((e) => ({
            ...e,
            winner_member_id:
              e.winner_member_id ||
              sessionScoreEvents.find((s) => s.id === e.id)
                ?.winner_participant_id ||
              "",
          }))}
          memberNames={memberNames}
          actorNames={actorNames}
          currentUserId={currentUserId}
          onEventRemoved={removeEvent}
        />
      </section>
    </div>
  );
}
