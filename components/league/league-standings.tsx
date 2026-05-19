"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/league-season";

interface LeagueStandingsProps {
  standings: StandingRow[];
  title?: string;
  compact?: boolean;
  className?: string;
}

export function LeagueStandings({
  standings,
  title = "Итоги лиги",
  compact = false,
  className,
}: LeagueStandingsProps) {
  if (standings.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/30 bg-amber-950/30",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <h3
        className={cn(
          "mb-3 flex items-center gap-2 font-semibold text-amber-200",
          compact ? "text-sm" : "text-base"
        )}
      >
        <Trophy className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
        {title}
      </h3>
      <ol className="space-y-2">
        {standings.map((row) => (
          <li
            key={row.memberId}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-3",
              compact ? "py-2" : "py-2.5",
              row.place === 1 && "border-amber-500/40 bg-amber-900/20"
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                  row.place === 1
                    ? "bg-amber-500/30 text-amber-200"
                    : "bg-zinc-800 text-zinc-400"
                )}
              >
                {row.place}
              </span>
              <span className="truncate font-medium text-zinc-100">
                {row.displayName}
              </span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-violet-300">
              {row.wins}{" "}
              <span className="font-normal text-zinc-500">
                {row.wins === 1 ? "победа" : row.wins < 5 ? "победы" : "побед"}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
