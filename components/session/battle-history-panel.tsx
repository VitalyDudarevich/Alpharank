"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, History, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArenaHistoryItem } from "@/lib/actions/arena";

type BattleHistoryPanelProps = {
  history: ArenaHistoryItem[];
  onSelect: (sessionId: string) => void;
};

function pluralRounds(n: number) {
  if (n === 1) return "игра";
  if (n >= 2 && n <= 4) return "игры";
  return "игр";
}

export function BattleHistoryPanel({
  history,
  onSelect,
}: BattleHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-700 py-10 text-center text-sm text-zinc-500">
        Сражений пока нет
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((item) => {
        const isActive = item.status === "active";
        const when = item.ended_at ?? item.started_at;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                isActive
                  ? "border-violet-500/50 bg-violet-600/15 hover:border-violet-400/70 hover:bg-violet-600/20"
                  : "border-zinc-700 bg-zinc-900/80 hover:border-violet-600/40 hover:bg-zinc-800/60"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "truncate font-medium",
                      isActive ? "text-violet-50" : "text-zinc-100"
                    )}
                  >
                    {item.game_name}
                  </p>
                  {isActive && (
                    <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Активно
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs",
                    isActive ? "text-violet-300/80" : "text-zinc-500"
                  )}
                >
                  {isActive && item.started_at
                    ? `Идёт с ${format(new Date(item.started_at), "d MMMM yyyy, HH:mm", { locale: ru })}`
                    : when
                      ? format(new Date(when), "d MMMM yyyy, HH:mm", {
                          locale: ru,
                        })
                      : format(new Date(item.session_date), "d MMMM yyyy", {
                          locale: ru,
                        })}
                </p>
                <p className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {item.participant_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <History className="h-3 w-3" />
                    {item.event_count} {pluralRounds(item.event_count)}
                  </span>
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
