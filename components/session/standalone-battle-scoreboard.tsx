"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addStandaloneWin } from "@/lib/actions/score";
import { buildMemberColorMap } from "@/lib/player-colors";
import type { BattleParticipant } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type StandaloneBattleScoreboardProps = {
  sessionId: string;
  gameName: string;
  participants: BattleParticipant[];
  winCounts: Record<string, number>;
  disabled?: boolean;
  onEventAdded?: (event: SessionScoreEvent) => void;
};

export function StandaloneBattleScoreboard({
  sessionId,
  gameName,
  participants,
  winCounts: initialCounts,
  disabled,
  onEventAdded,
}: StandaloneBattleScoreboardProps) {
  const [localCounts, setLocalCounts] = useState(initialCounts);
  const [pending, startTransition] = useTransition();
  const participantIds = participants.map((p) => p.id);
  const memberColors = buildMemberColorMap(participantIds);

  useEffect(() => {
    setLocalCounts((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(initialCounts)]);
      let changed = false;
      for (const k of keys) {
        if ((prev[k] ?? 0) !== (initialCounts[k] ?? 0)) {
          changed = true;
          break;
        }
      }
      return changed ? initialCounts : prev;
    });
  }, [initialCounts]);

  const handlePoint = (participant: BattleParticipant) => {
    if (disabled) return;
    setLocalCounts((prev) => ({
      ...prev,
      [participant.id]: (prev[participant.id] ?? 0) + 1,
    }));

    startTransition(async () => {
      const result = await addStandaloneWin({
        sessionId,
        winnerParticipantId: participant.id,
        participantIds,
        winnerDisplayName: participant.display_name,
        gameName,
      });

      if (result.error) {
        setLocalCounts((prev) => ({
          ...prev,
          [participant.id]: Math.max(0, (prev[participant.id] ?? 1) - 1),
        }));
        toast.error(result.error);
        return;
      }

      if (result.eventId) {
        onEventAdded?.({
          id: result.eventId,
          winner_member_id: null,
          winner_participant_id: participant.id,
          participant_ids: participantIds,
          game_id: null,
          created_at: new Date().toISOString(),
          created_by: "",
          deleted_at: null,
        });
      }

      if (navigator.vibrate) navigator.vibrate(30);
    });
  };

  return (
    <ul className="divide-y divide-zinc-800">
      {participants.map((participant) => (
        <li
          key={participant.id}
          className="grid grid-cols-[minmax(0,1fr)_3rem_2.75rem] items-center gap-2 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: memberColors[participant.id] }}
            />
            <span className="truncate font-medium text-zinc-100">
              {participant.display_name}
            </span>
          </div>
          <span className="text-center text-2xl font-bold tabular-nums text-violet-300">
            {localCounts[participant.id] ?? 0}
          </span>
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => handlePoint(participant)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-600/20 text-emerald-300",
              "hover:bg-emerald-600/35 active:scale-95 disabled:opacity-40"
            )}
            aria-label={`+1 ${participant.display_name}`}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}
