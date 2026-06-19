"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, intervalToDuration } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { endBattle } from "@/lib/actions/arena";
import { DeferredArenaWinsChart } from "./deferred-arena-wins-chart";
import { BattleReadonlyScoreboard } from "./battle-readonly-scoreboard";
import { BattleActionsMenu } from "./battle-actions-menu";
import { StandaloneBattleScoreboard } from "./standalone-battle-scoreboard";
import { SmartBattleScoreboard } from "./smart-battle-scoreboard";
import { SessionEventLog } from "./session-event-log";
import { useSessionScoreEvents } from "./use-session-score-events";
import { PullToRefreshIndicator } from "./pull-to-refresh-indicator";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { winCountsFromEvents } from "@/lib/arena-games";
import { buildSessionLogEvents } from "@/lib/session-log";
import { computeSessionPoints } from "@/lib/session-stats";
import type { BattleParticipant, ScoringMode } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type StandaloneActiveBattleViewProps = {
  sessionId: string;
  gameName: string;
  participants: BattleParticipant[];
  sessionScoreEvents: SessionScoreEvent[];
  actorNames: Record<string, string>;
  currentUserId: string | null;
  startedAt: string | null;
  scoringMode?: ScoringMode;
  participantSlots?: number | null;
  readOnly?: boolean;
  canDelete?: boolean;
  onBack: () => void;
  onEnded?: () => void;
  onDeleted?: () => void;
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
  actorNames,
  currentUserId,
  startedAt,
  scoringMode = "classic",
  participantSlots = null,
  readOnly = false,
  canDelete = false,
  onBack,
  onEnded,
  onDeleted,
}: StandaloneActiveBattleViewProps) {
  const isSmart = scoringMode === "smart";
  const slots = participantSlots ?? participants.length;
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

  const { events: sessionEvents, appendEvent, markEventDeleted, reload } =
    useSessionScoreEvents({
      sessionId,
      participantIds,
      initialEvents: sessionScoreEvents,
    });

  const { pullDistance, refreshing } = usePullToRefresh({ onRefresh: reload });

  const winCounts = useMemo(
    () => winCountsFromEvents(sessionEvents, null),
    [sessionEvents]
  );

  const pointTotals = useMemo(
    () => (isSmart ? computeSessionPoints(sessionEvents, slots) : {}),
    [isSmart, sessionEvents, slots]
  );

  const memberNames = useMemo(
    () =>
      Object.fromEntries(
        participants.map((p) => [p.id, p.display_name])
      ),
    [participants]
  );

  const logEvents = useMemo(
    () =>
      buildSessionLogEvents(
        sessionEvents,
        memberNames,
        actorNames,
        currentUserId ?? ""
      ),
    [sessionEvents, memberNames, actorNames, currentUserId]
  );

  const roundsPlayed = logEvents.length;

  const durationMs = startedAt
    ? now - new Date(startedAt).getTime()
    : 0;

  const handleEnd = () => {
    if (readOnly || !onEnded) return;
    startEndTransition(async () => {
      const result = await endBattle(sessionId);
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
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
        >
          <ArrowLeft className="h-4 w-4" />
          К арене
        </button>
        <BattleActionsMenu
          sessionId={sessionId}
          canDelete={canDelete}
          onDeleted={onDeleted}
        />
      </div>
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
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-400">Очки</h2>
          {isSmart && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
              Умный · {slots} мест
            </span>
          )}
        </div>
        {readOnly ? (
          <BattleReadonlyScoreboard
            participants={participants}
            winCounts={isSmart ? pointTotals : winCounts}
          />
        ) : isSmart ? (
          <SmartBattleScoreboard
            sessionId={sessionId}
            gameName={gameName}
            participants={participants}
            currentUserId={currentUserId!}
            slots={slots}
            events={sessionEvents}
            onEventAdded={appendEvent}
          />
        ) : (
          <StandaloneBattleScoreboard
            sessionId={sessionId}
            gameName={gameName}
            participants={participants}
            currentUserId={currentUserId!}
            winCounts={winCounts}
            onEventAdded={appendEvent}
          />
        )}
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

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
        <h2 className="mb-1 text-sm font-medium text-zinc-300">
          История изменений
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Каждое +1 записывается здесь. Ошиблись — нажмите «Откат» (до 20 минут).
        </p>
        <SessionEventLog
          events={logEvents}
          currentUserId={currentUserId ?? ""}
          readOnly={readOnly}
          onEventUndone={readOnly ? undefined : markEventDeleted}
        />
      </section>

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full border-zinc-600 text-zinc-200"
          disabled={ending}
          onClick={handleEnd}
        >
          {ending ? "Завершение…" : "Завершить сражение"}
        </Button>
      )}
    </div>
  );
}
