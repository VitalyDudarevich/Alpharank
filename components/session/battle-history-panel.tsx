"use client";

import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronRight, History, Users } from "lucide-react";
import type { ArenaHistoryItem } from "@/lib/actions/arena";

type BattleHistoryPanelProps = {
  history: ArenaHistoryItem[];
  onSelect: (sessionId: string) => void;
};

export function BattleHistoryPanel({
  history,
  onSelect,
}: BattleHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-700 py-10 text-center text-sm text-zinc-500">
        Завершённых сражений пока нет
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {history.map((item) => {
        const when = item.ended_at ?? item.started_at;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-left transition-colors hover:border-violet-600/40 hover:bg-zinc-800/60"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">
                  {item.game_name}
                </p>
                <p className="text-xs text-zinc-500">
                  {when
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
                    {item.event_count} очков
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
