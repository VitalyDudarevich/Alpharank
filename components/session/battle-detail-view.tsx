"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, intervalToDuration } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { fetchBattleDetail } from "@/lib/actions/arena";
import { BattleActionsMenu } from "@/components/session/battle-actions-menu";
import { winCountsFromEvents } from "@/lib/arena-games";
import { buildSessionLogEvents } from "@/lib/session-log";
import { BattleReadonlyScoreboard } from "./battle-readonly-scoreboard";
import { DeferredArenaWinsChart } from "./deferred-arena-wins-chart";
import { SessionEventLog } from "./session-event-log";
import { PullToRefreshIndicator } from "./pull-to-refresh-indicator";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { computeSessionPoints } from "@/lib/session-stats";
import type { BattleParticipant, ScoringMode } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type BattleDetailViewProps = {
  sessionId: string;
  currentUserId: string | null;
  /** Создатель сражения (из списка арены) */
  canDelete?: boolean;
  onBack: () => void;
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

function pluralRounds(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "раунд";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "раунда";
  return "раундов";
}

export function BattleDetailView({
  sessionId,
  currentUserId,
  canDelete: canDeleteProp,
  onBack,
  onDeleted,
}: BattleDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionScoreEvent[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("classic");
  const [slots, setSlots] = useState<number | null>(null);

  const applyDetail = useCallback(
    (data: Awaited<ReturnType<typeof fetchBattleDetail>>) => {
      if ("error" in data) {
        setError(data.error ?? "Ошибка загрузки");
        return;
      }
      setError(null);
      setGameName(data.session.game_name);
      setStartedAt(data.session.started_at);
      setEndedAt(data.session.ended_at);
      setCreatedBy(data.session.created_by);
      setScoringMode(data.session.scoring_mode);
      setSlots(data.session.participant_slots);
      setParticipants(data.participants);
      setActorNames(data.actorNames);
      setSessionEvents(
        data.events.map((e) => ({
          id: e.id,
          winner_member_id: null,
          winner_participant_id: e.winner_participant_id,
          participant_ids: e.participant_ids,
          placements: e.placements ?? null,
          game_id: null,
          created_at: e.created_at,
          created_by: e.created_by ?? "",
          deleted_at: e.deleted_at,
        }))
      );
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchBattleDetail(sessionId).then((data) => {
      if (cancelled) return;
      applyDetail(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId, applyDetail]);

  // Перечитать детали без экрана «Загрузка…» (показывается спиннер pull-to-refresh).
  const reloadDetail = useCallback(async () => {
    const data = await fetchBattleDetail(sessionId);
    applyDetail(data);
  }, [sessionId, applyDetail]);

  const { pullDistance, refreshing } = usePullToRefresh({
    onRefresh: reloadDetail,
  });

  const participantIds = participants.map((p) => p.id);
  const memberNames = useMemo(
    () => Object.fromEntries(participants.map((p) => [p.id, p.display_name])),
    [participants]
  );
  const winCounts = useMemo(
    () => winCountsFromEvents(sessionEvents, null),
    [sessionEvents]
  );
  const isSmart = scoringMode === "smart";
  const pointTotals = useMemo(
    () =>
      isSmart
        ? computeSessionPoints(sessionEvents, slots ?? participants.length)
        : {},
    [isSmart, sessionEvents, slots, participants.length]
  );
  const logEvents = useMemo(
    () =>
      buildSessionLogEvents(
        sessionEvents,
        memberNames,
        actorNames,
        currentUserId ?? "",
        isSmart ? slots ?? participants.length : null
      ),
    [sessionEvents, memberNames, actorNames, currentUserId, isSmart, slots, participants.length]
  );

  const durationMs =
    startedAt && endedAt
      ? new Date(endedAt).getTime() - new Date(startedAt).getTime()
      : 0;

  const canDelete =
    !!onDeleted &&
    (canDeleteProp ??
      (!!currentUserId && !!createdBy && createdBy === currentUserId));

  if (loading) {
    return <p className="py-12 text-center text-sm text-zinc-500">Загрузка…</p>;
  }

  if (error) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-violet-400 hover:text-violet-300"
        >
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к арене
        </button>
        <BattleActionsMenu
          sessionId={sessionId}
          canDelete={canDelete}
          onDeleted={onDeleted}
        />
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Завершённое сражение
        </p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-100">{gameName}</h2>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          {startedAt && endedAt && (
            <>
              <li>
                {format(new Date(startedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                {" — "}
                {format(new Date(endedAt), "HH:mm", { locale: ru })}
              </li>
              <li className="text-zinc-700" aria-hidden>
                ·
              </li>
              <li>{formatBattleDuration(durationMs)}</li>
              <li className="text-zinc-700" aria-hidden>
                ·
              </li>
            </>
          )}
          <li>
            {participants.length} игроков · {logEvents.length}{" "}
            {pluralRounds(logEvents.length)}
          </li>
        </ul>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-400">Итог</h2>
          {isSmart && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
              Умный подсчёт ({slots ?? participants.length} мест)
            </span>
          )}
        </div>
        <BattleReadonlyScoreboard
          participants={participants}
          winCounts={winCounts}
          pointCounts={isSmart ? pointTotals : undefined}
        />
      </section>

      {sessionEvents.some((e) => !e.deleted_at) && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">График</h2>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
            <DeferredArenaWinsChart
              events={sessionEvents}
              memberNames={memberNames}
              memberIds={participantIds}
              gameId={null}
              scoringMode={scoringMode}
              participantSlots={slots}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">
          История изменений
        </h2>
        <SessionEventLog
          events={logEvents}
          currentUserId={currentUserId ?? ""}
          readOnly
        />
      </section>
    </div>
  );
}
