"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { fetchSeriesDetail } from "@/lib/actions/arena";
import type { ArenaHistorySeries } from "@/lib/arena-history-series";
import { winCountsFromEvents } from "@/lib/arena-games";
import { buildSessionLogEvents } from "@/lib/session-log";
import { seriesMemberIds, seriesMemberNames } from "@/lib/series-stats";
import { playerIdFromName } from "@/lib/stats";
import type { SessionScoreEvent } from "@/lib/session-stats";
import { BattleReadonlyScoreboard } from "./battle-readonly-scoreboard";
import { DeferredArenaWinsChart } from "./deferred-arena-wins-chart";
import { SessionEventLog } from "./session-event-log";
import type { BattleParticipant } from "@/lib/types";

type SeriesDetailViewProps = {
  series: ArenaHistorySeries;
  currentUserId: string;
  onBack: () => void;
  onSelectBattle: (sessionId: string) => void;
};

function pluralBattles(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "сражение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "сражения";
  return "сражений";
}

function pluralRounds(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "раунд";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "раунда";
  return "раундов";
}

export function SeriesDetailView({
  series,
  currentUserId,
  onBack,
  onSelectBattle,
}: SeriesDetailViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameName, setGameName] = useState(series.game_name);
  const [events, setEvents] = useState<SessionScoreEvent[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [battleCount, setBattleCount] = useState(series.battle_count);

  const sessionIds = useMemo(
    () => series.battles.map((b) => b.id),
    [series.battles]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchSeriesDetail(sessionIds).then((data) => {
      if (cancelled) return;
      if ("error" in data) {
        setError(data.error ?? "Ошибка загрузки");
        setLoading(false);
        return;
      }
      setGameName(data.game_name);
      setEvents(data.events);
      setActorNames(data.actorNames);
      setBattleCount(data.battle_count);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionIds]);

  const memberNames = useMemo(
    () => seriesMemberNames(series.participant_names),
    [series.participant_names]
  );

  const memberIds = useMemo(
    () => seriesMemberIds(series.participant_names),
    [series.participant_names]
  );

  const participants: BattleParticipant[] = useMemo(
    () =>
      series.participant_names.map((display_name) => ({
        id: playerIdFromName(display_name),
        session_id: "",
        display_name,
        user_id: null,
        created_at: "",
      })),
    [series.participant_names]
  );

  const winCounts = useMemo(
    () => winCountsFromEvents(events, null),
    [events]
  );

  const activeRounds = useMemo(
    () => events.filter((e) => !e.deleted_at).length,
    [events]
  );

  const logEvents = useMemo(
    () =>
      buildSessionLogEvents(events, memberNames, actorNames, currentUserId),
    [events, memberNames, actorNames, currentUserId]
  );

  const battlesSorted = useMemo(
    () =>
      [...series.battles].sort((a, b) => {
        const ta = new Date(
          a.ended_at ?? a.started_at ?? a.session_date
        ).getTime();
        const tb = new Date(
          b.ended_at ?? b.started_at ?? b.session_date
        ).getTime();
        return tb - ta;
      }),
    [series.battles]
  );

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
          ← Все серии
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Все серии
      </button>

      <div className="rounded-2xl border border-violet-500/40 bg-violet-600/10 px-4 py-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-300/80">
          Серия
        </p>
        <h2 className="mt-1 text-2xl font-bold text-violet-50">{gameName}</h2>
        <p className="mt-1 text-sm text-violet-300/90">
          {series.participant_names.join(", ")}
        </p>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-violet-300/90">
          <li>
            {battleCount} {pluralBattles(battleCount)}
          </li>
          <li className="text-violet-500/50" aria-hidden>
            ·
          </li>
          <li>
            {activeRounds} {pluralRounds(activeRounds)}
          </li>
        </ul>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-400">Итог серии</h2>
        </div>
        <BattleReadonlyScoreboard
          participants={participants}
          winCounts={winCounts}
        />
      </section>

      {events.some((e) => !e.deleted_at) && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">График серии</h2>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
            <DeferredArenaWinsChart
              events={events}
              memberNames={memberNames}
              memberIds={memberIds}
              gameId={null}
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
          currentUserId={currentUserId}
          readOnly
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">
          Сражения в серии
        </h2>
        <ul className="space-y-2">
          {battlesSorted.map((battle) => {
            const when = battle.ended_at ?? battle.started_at;
            return (
              <li key={battle.id}>
                <button
                  type="button"
                  onClick={() => onSelectBattle(battle.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-left transition-colors hover:border-violet-600/40 hover:bg-zinc-800/60"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-300">
                      {when
                        ? format(new Date(when), "d MMMM yyyy, HH:mm", {
                            locale: ru,
                          })
                        : format(new Date(battle.session_date), "d MMMM yyyy", {
                            locale: ru,
                          })}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {battle.event_count} игр
                      {battle.status === "active" ? " · активно" : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
