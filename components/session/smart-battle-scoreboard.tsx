"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addRoundPlacements } from "@/lib/actions/score";
import { buildMemberColorMap } from "@/lib/player-colors";
import { winCountsFromEvents } from "@/lib/arena-games";
import { computeSessionPoints, pointsForPlace } from "@/lib/session-stats";
import type { BattleParticipant } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type SmartBattleScoreboardProps = {
  sessionId: string;
  gameName: string;
  participants: BattleParticipant[];
  currentUserId: string;
  /** Число мест (= максимум очков). */
  slots: number;
  events: SessionScoreEvent[];
  disabled?: boolean;
  onEventAdded?: (event: SessionScoreEvent) => void;
};

export function SmartBattleScoreboard({
  sessionId,
  gameName,
  participants,
  currentUserId,
  slots,
  events,
  disabled,
  onEventAdded,
}: SmartBattleScoreboardProps) {
  const [entering, setEntering] = useState(false);
  const [places, setPlaces] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();

  const participantIds = participants.map((p) => p.id);
  const memberColors = buildMemberColorMap(participantIds);

  const totals = useMemo(
    () => computeSessionPoints(events, slots),
    [events, slots]
  );

  const winCounts = useMemo(
    () => winCountsFromEvents(events, null),
    [events]
  );

  // Вне ввода — сортируем по очкам, затем по победам; во время ввода держим исходный порядок.
  const ordered = useMemo(() => {
    if (entering) return participants;
    return [...participants].sort(
      (a, b) =>
        (totals[b.id] ?? 0) - (totals[a.id] ?? 0) ||
        (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0)
    );
  }, [participants, totals, winCounts, entering]);

  const takenPlaces = new Set(
    Object.values(places).filter((place) => place > 0)
  );
  const allAssigned = participants.every((p) => places[p.id] != null);

  const setPlace = (pid: string, place: number) => {
    setPlaces((prev) => {
      const next = { ...prev };
      if (next[pid] === place) {
        delete next[pid];
        return next;
      }
      if (place > 0) {
        for (const key of Object.keys(next)) {
          if (next[key] === place) delete next[key];
        }
      }
      next[pid] = place;
      return next;
    });
  };

  const cancel = () => {
    setEntering(false);
    setPlaces({});
  };

  const commit = () => {
    if (!allAssigned || pending || disabled) return;
    const roundPlaces = { ...places };
    startTransition(async () => {
      const result = await addRoundPlacements({
        sessionId,
        placements: roundPlaces,
        participantIds,
        gameName,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.eventId) {
        const active = Object.entries(roundPlaces).filter(([, place]) => place > 0);
        const winnerId =
          active.length > 0
            ? active.reduce((best, cur) => (cur[1] < best[1] ? cur : best))[0]
            : null;
        onEventAdded?.({
          id: result.eventId,
          winner_member_id: null,
          winner_participant_id: winnerId,
          participant_ids: participantIds,
          placements: roundPlaces,
          game_id: null,
          created_at: new Date().toISOString(),
          created_by: currentUserId,
          deleted_at: null,
        });
      }
      if (navigator.vibrate) navigator.vibrate(30);
      setEntering(false);
      setPlaces({});
    });
  };

  return (
    <div>
      <ul className="divide-y divide-zinc-800">
        {ordered.map((p) => (
          <li key={p.id} className="px-4 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: memberColors[p.id] }}
                />
                <span className="truncate font-medium text-zinc-100">
                  {p.display_name}
                </span>
                {entering && places[p.id] != null && (
                  <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                    {places[p.id] === 0
                      ? "не играл · +0"
                      : `${places[p.id]}-е · +${pointsForPlace(slots, places[p.id])}`}
                  </span>
                )}
              </div>
              <span className="text-center text-2xl font-bold tabular-nums text-violet-300">
                {winCounts[p.id] ?? 0}
              </span>
              <span className="text-center text-2xl font-bold tabular-nums text-amber-300">
                {totals[p.id] ?? 0}
              </span>
            </div>

            {entering && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={pending || disabled}
                  onClick={() => setPlace(p.id, 0)}
                  className={cn(
                    "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition-colors",
                    places[p.id] === 0
                      ? "border-zinc-500 bg-zinc-700/50 text-zinc-200"
                      : "border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-500"
                  )}
                  aria-label="Не участвовал, +0 очков"
                >
                  0
                </button>
                {Array.from({ length: slots }, (_, i) => i + 1).map((place) => {
                  const selected = places[p.id] === place;
                  const takenByOther = takenPlaces.has(place) && !selected;
                  return (
                    <button
                      key={place}
                      type="button"
                      disabled={pending || disabled || takenByOther}
                      onClick={() => setPlace(p.id, place)}
                      className={cn(
                        "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition-colors",
                        selected
                          ? "border-amber-400 bg-amber-500/25 text-amber-200"
                          : takenByOther
                            ? "border-zinc-800 bg-zinc-900 text-zinc-700"
                            : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-amber-500/50"
                      )}
                      aria-label={`${place} место, +${pointsForPlace(slots, place)} очков`}
                    >
                      {place}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-zinc-800 p-3">
        {entering ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="h-11 flex-1 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!allAssigned || pending || disabled}
              className="h-11 flex-[2] rounded-lg bg-violet-600 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
            >
              {pending
                ? "Запись…"
                : allAssigned
                  ? "Записать раунд"
                  : "Выберите места всем"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEntering(true)}
            disabled={disabled}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/20 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/35 disabled:opacity-40"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Добавить раунд
          </button>
        )}
      </div>
    </div>
  );
}
