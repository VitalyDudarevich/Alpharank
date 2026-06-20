"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { undoWin } from "@/lib/actions/score";
import { canUndoScoreEvent } from "@/lib/score-undo";
import { toast } from "sonner";
import { RotateCcw, Trophy } from "lucide-react";

/** Строка результата участника в раунде умного подсчёта. */
export type SessionLogStanding = {
  name: string;
  /** Место за раунд; 0 = не участвовал. */
  place: number;
  points: number;
};

export type SessionLogEvent = {
  id: string;
  winner_member_id: string;
  winner_name: string;
  /** Номер раунда на графике (ось «Игры»), с 1 */
  game_number: number;
  actor_name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  /** Места и очки участников за раунд (умный режим); null для обычных раундов. */
  standings?: SessionLogStanding[] | null;
};

type SessionEventLogProps = {
  events: SessionLogEvent[];
  currentUserId: string;
  readOnly?: boolean;
  onEventUndone?: (eventId: string) => void;
};

export function SessionEventLog({
  events,
  currentUserId,
  readOnly = false,
  onEventUndone,
}: SessionEventLogProps) {
  const [pending, startTransition] = useTransition();

  const handleUndo = (eventId: string) => {
    if (readOnly || pending) return;
    startTransition(async () => {
      const result = await undoWin(eventId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      onEventUndone?.(eventId);
      toast.success("Очко отменено");
    });
  };

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-700 py-6 text-center text-sm text-zinc-500">
        Изменений пока нет. После +1 здесь появится запись с кнопкой отката.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event, index) => {
        const showUndo =
          !readOnly &&
          canUndoScoreEvent(event.created_by, event.created_at, currentUserId);
        const isLatest = index === 0;

        return (
          <li
            key={event.id}
            className={
              isLatest
                ? "flex items-start justify-between gap-2 rounded-xl border border-violet-500/30 bg-violet-600/10 px-3 py-2.5"
                : "flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
            }
          >
            <div className="flex min-w-0 gap-2">
              <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                {event.standings && event.standings.length > 0 ? (
                  <p className="text-sm text-zinc-100">
                    <span className="text-zinc-400">Раунд </span>
                    <span className="font-semibold tabular-nums text-zinc-100">
                      {event.game_number}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-zinc-100">
                    <span className="text-zinc-400">Игра </span>
                    <span className="font-semibold tabular-nums text-zinc-100">
                      {event.game_number}
                    </span>
                    <span className="text-zinc-500"> · +1 </span>
                    <span className="font-medium text-violet-200">
                      {event.winner_name}
                    </span>
                  </p>
                )}
                {event.standings && event.standings.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {event.standings.map((s, i) => (
                      <li
                        key={`${event.id}-${i}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={
                            s.place === 0
                              ? "shrink-0 tabular-nums text-zinc-600"
                              : "shrink-0 tabular-nums font-semibold text-amber-300"
                          }
                        >
                          {s.place === 0 ? "—" : `${s.place}-е`}
                        </span>
                        <span
                          className={
                            s.place === 0
                              ? "min-w-0 truncate text-zinc-500"
                              : "min-w-0 truncate text-zinc-200"
                          }
                        >
                          {s.name}
                        </span>
                        <span
                          className={
                            s.place === 0
                              ? "shrink-0 tabular-nums text-zinc-600"
                              : "shrink-0 tabular-nums text-violet-300"
                          }
                        >
                          {s.place === 0 ? "не играл" : `+${s.points}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  {event.actor_name}
                  {" · "}
                  {format(new Date(event.created_at), "d MMM, HH:mm:ss", {
                    locale: ru,
                  })}
                </p>
              </div>
            </div>
            {showUndo && (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleUndo(event.id)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-300 disabled:opacity-40"
                title="Отменить начисление очка"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Откат
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
