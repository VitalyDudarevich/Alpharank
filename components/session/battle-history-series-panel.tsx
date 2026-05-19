"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, History, Swords, Users } from "lucide-react";
import type { ArenaHistorySeries } from "@/lib/arena-history-series";

type BattleHistorySeriesPanelProps = {
  series: ArenaHistorySeries[];
  onSelectSeries: (seriesKey: string) => void;
};

function pluralBattles(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "сражение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "сражения";
  return "сражений";
}

function pluralRounds(n: number) {
  if (n === 1) return "игра";
  if (n >= 2 && n <= 4) return "игры";
  return "игр";
}

export function BattleHistorySeriesPanel({
  series,
  onSelectSeries,
}: BattleHistorySeriesPanelProps) {
  if (series.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-700 py-10 text-center text-sm text-zinc-500">
        Нет серий по выбранным условиям
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {series.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onSelectSeries(item.key)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-left transition-colors hover:border-violet-600/40 hover:bg-zinc-800/60"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-100">{item.game_name}</p>
              <p className="mt-0.5 truncate text-xs text-violet-300/80">
                {item.participant_names.join(", ")}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-600">
                <span className="flex items-center gap-1">
                  <Swords className="h-3 w-3" />
                  {item.battle_count} {pluralBattles(item.battle_count)}
                </span>
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {item.total_rounds} {pluralRounds(item.total_rounds)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.participant_names.length}
                </span>
              </p>
              {item.last_ended_at && (
                <p className="mt-1 text-xs text-zinc-500">
                  Последнее:{" "}
                  {format(new Date(item.last_ended_at), "d MMMM yyyy, HH:mm", {
                    locale: ru,
                  })}
                </p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
          </button>
        </li>
      ))}
    </ul>
  );
}
