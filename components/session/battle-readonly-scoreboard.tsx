"use client";

import { buildMemberColorMap } from "@/lib/player-colors";
import type { BattleParticipant } from "@/lib/types";

type BattleReadonlyScoreboardProps = {
  participants: BattleParticipant[];
  winCounts: Record<string, number>;
};

export function BattleReadonlyScoreboard({
  participants,
  winCounts,
}: BattleReadonlyScoreboardProps) {
  const memberColors = buildMemberColorMap(participants.map((p) => p.id));
  const sorted = [...participants].sort(
    (a, b) => (winCounts[b.id] ?? 0) - (winCounts[a.id] ?? 0)
  );

  return (
    <ul className="divide-y divide-zinc-800">
      {sorted.map((participant, index) => (
        <li
          key={participant.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-5 shrink-0 text-center text-xs font-medium text-zinc-600">
              {index + 1}
            </span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: memberColors[participant.id] }}
            />
            <span className="truncate font-medium text-zinc-100">
              {participant.display_name}
            </span>
          </div>
          <span className="text-2xl font-bold tabular-nums text-violet-300">
            {winCounts[participant.id] ?? 0}
          </span>
        </li>
      ))}
    </ul>
  );
}
