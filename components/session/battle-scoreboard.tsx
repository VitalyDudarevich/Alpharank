"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addWin } from "@/lib/actions/score";
import { buildMemberColorMap } from "@/lib/player-colors";
import type { LeagueMember } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type BattleScoreboardProps = {
  leagueId: string;
  sessionId: string;
  gameId: string;
  gameName: string;
  members: LeagueMember[];
  participantIds: string[];
  winCounts: Record<string, number>;
  eloEnabled: boolean;
  eloK: number;
  disabled?: boolean;
  onWinRecorded?: () => void;
  onEventAdded?: (event: SessionScoreEvent) => void;
};

export function BattleScoreboard({
  leagueId,
  sessionId,
  gameId,
  gameName,
  members,
  participantIds,
  winCounts: initialCounts,
  eloEnabled,
  eloK,
  disabled,
  onWinRecorded,
  onEventAdded,
}: BattleScoreboardProps) {
  const [localCounts, setLocalCounts] = useState(initialCounts);
  const [pending, startTransition] = useTransition();
  const memberColors = buildMemberColorMap(members.map((m) => m.id));

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

  const handlePoint = (member: LeagueMember) => {
    if (disabled) return;
    setLocalCounts((prev) => ({
      ...prev,
      [member.id]: (prev[member.id] ?? 0) + 1,
    }));

    startTransition(async () => {
      const result = await addWin({
        leagueId,
        sessionId,
        gameId,
        winnerMemberId: member.id,
        participantIds,
        winnerDisplayName: member.display_name,
        gameName,
        eloEnabled,
        eloK,
      });

      if (result.error) {
        setLocalCounts((prev) => ({
          ...prev,
          [member.id]: Math.max(0, (prev[member.id] ?? 1) - 1),
        }));
        toast.error(result.error);
        return;
      }

      if (result.eventId) {
        onEventAdded?.({
          id: result.eventId,
          winner_member_id: member.id,
          participant_ids: participantIds,
          game_id: gameId,
          created_at: new Date().toISOString(),
          created_by: "",
          deleted_at: null,
        });
      }

      onWinRecorded?.();
      if (navigator.vibrate) navigator.vibrate(30);
    });
  };

  return (
    <ul className="divide-y divide-zinc-800">
      {members.map((member) => (
        <li
          key={member.id}
          className="grid grid-cols-[minmax(0,1fr)_3rem_2.75rem] items-center gap-2 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: memberColors[member.id] }}
            />
            <span className="truncate font-medium text-zinc-100">
              {member.display_name}
            </span>
          </div>
          <span className="text-center text-2xl font-bold tabular-nums text-violet-300">
            {localCounts[member.id] ?? 0}
          </span>
          <button
            type="button"
            disabled={pending || disabled}
            onClick={() => handlePoint(member)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-600/20 text-emerald-300",
              "hover:bg-emerald-600/35 active:scale-95 disabled:opacity-40"
            )}
            aria-label={`+1 ${member.display_name}`}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </li>
      ))}
    </ul>
  );
}
