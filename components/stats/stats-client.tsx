"use client";

import { useMemo, useState } from "react";
import type { Game, LeagueMember, ScoreEvent, StatsFilter } from "@/lib/types";
import { filterScoreEvents, computeMemberStats, buildCumulativeTimeline } from "@/lib/stats";
import { StatsFilters } from "./stats-filters";
import { StatsTable } from "./stats-table";
import { StatsCharts } from "./stats-charts";

interface StatsClientProps {
  events: ScoreEvent[];
  members: LeagueMember[];
  games: Game[];
  eloEnabled: boolean;
  eloRatings: { member_id: string; game_id: string | null; rating: number }[];
  filterGameId?: string;
}

export function StatsClient({
  events,
  members,
  games,
  eloEnabled,
  eloRatings,
}: StatsClientProps) {
  const [filter, setFilter] = useState<StatsFilter>({});
  const [showElo, setShowElo] = useState(eloEnabled);

  const filteredEvents = useMemo(() => {
    let filtered = filterScoreEvents(events, filter);

    if (filter.dateFrom || filter.dateTo) {
      filtered = filtered.filter((e) => {
        const date = e.created_at.split("T")[0];
        if (filter.dateFrom && date < filter.dateFrom) return false;
        if (filter.dateTo && date > filter.dateTo) return false;
        return true;
      });
    }

    return filtered;
  }, [events, filter]);

  const eloMap = useMemo(() => {
    const map = new Map<string, number>();
    const gameId = filter.gameId ?? null;
    eloRatings
      .filter((r) => r.game_id === gameId || (!gameId && r.game_id === null))
      .forEach((r) => map.set(r.member_id, Number(r.rating)));
    return map;
  }, [eloRatings, filter.gameId]);

  const stats = useMemo(
    () =>
      computeMemberStats(
        filteredEvents,
        members,
        showElo && eloEnabled ? eloMap : undefined
      ),
    [filteredEvents, members, showElo, eloEnabled, eloMap]
  );

  const timeline = useMemo(
    () => buildCumulativeTimeline(filteredEvents, members),
    [filteredEvents, members]
  );

  return (
    <div className="space-y-6">
      <StatsFilters
        games={games}
        members={members}
        filter={filter}
        onChange={setFilter}
      />

      {eloEnabled && (
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={showElo}
            onChange={(e) => setShowElo(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Показать ELO
        </label>
      )}

      <StatsTable stats={stats} showElo={showElo && eloEnabled} />
      <StatsCharts stats={stats} timeline={timeline} showElo={showElo && eloEnabled} />
    </div>
  );
}
