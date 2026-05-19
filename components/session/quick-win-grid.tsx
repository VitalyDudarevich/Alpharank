"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { addWin, undoWin } from "@/lib/actions/score";
import type { LeagueMember } from "@/lib/types";

interface QuickWinGridProps {
  leagueId: string;
  sessionId: string;
  gameId: string;
  gameName: string;
  participants: LeagueMember[];
  winCounts: Record<string, number>;
  eloEnabled: boolean;
  eloK: number;
}

export function QuickWinGrid({
  leagueId,
  sessionId,
  gameId,
  gameName,
  participants,
  winCounts: initialCounts,
  eloEnabled,
  eloK,
}: QuickWinGridProps) {
  const [pending, startTransition] = useTransition();
  const [localCounts, setLocalCounts] = useState(initialCounts);
  const participantIds = participants.map((p) => p.id);

  const handleWin = (memberId: string, displayName: string) => {
    if (participantIds.length < 2) {
      toast.error("Выберите минимум 2 участников");
      return;
    }

    setLocalCounts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? 0) + 1,
    }));

    startTransition(async () => {
      const result = await addWin({
        leagueId,
        sessionId,
        gameId,
        winnerMemberId: memberId,
        participantIds,
        winnerDisplayName: displayName,
        gameName,
        eloEnabled,
        eloK,
      });

      if (result.error) {
        setLocalCounts((prev) => ({
          ...prev,
          [memberId]: Math.max(0, (prev[memberId] ?? 1) - 1),
        }));
        toast.error(result.error);
        return;
      }

      if (result.eventId) {
        const eventId = result.eventId;
        toast.success(`+1 ${displayName}`, {
          action: {
            label: "Отменить",
            onClick: () => {
              startTransition(async () => {
                const undo = await undoWin(leagueId, eventId);
                if (undo.error) toast.error(undo.error);
                else {
                  setLocalCounts((prev) => ({
                    ...prev,
                    [memberId]: Math.max(0, (prev[memberId] ?? 1) - 1),
                  }));
                  toast.info("Отменено");
                }
              });
            },
          },
          duration: 5000,
        });
      }

      if (navigator.vibrate) navigator.vibrate(50);
    });
  };

  if (participants.length === 0) {
    return (
      <Card className="text-center text-zinc-400">
        Отметьте участников дня выше
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {participants.map((member) => (
        <button
          key={member.id}
          type="button"
          disabled={pending}
          onClick={() => handleWin(member.id, member.display_name)}
          className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 transition-transform active:scale-[0.97] hover:border-emerald-600/50 disabled:opacity-60"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/20 text-2xl font-bold text-emerald-400 group-active:bg-emerald-600 group-active:text-white">
            +1
          </div>
          <span className="text-center text-sm font-semibold text-zinc-100">
            {member.display_name}
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Trophy className="h-3 w-3 text-amber-400" />
            {localCounts[member.id] ?? 0} сегодня
          </span>
        </button>
      ))}
    </div>
  );
}
