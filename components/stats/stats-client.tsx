"use client";

import { useMemo, useState } from "react";
import type { ScoreEvent, StatsFilter, StatsPlayer } from "@/lib/types";
import {
  filterScoreEvents,
  computeMemberStats,
  buildCumulativeTimeline,
} from "@/lib/stats";
import { StatsFilters } from "./stats-filters";
import { StatsTable } from "./stats-table";
import { StatsCharts } from "./stats-charts";

interface StatsClientProps {
  events: ScoreEvent[];
  players: StatsPlayer[];
  gameNames: string[];
}

export function StatsClient({ events, players, gameNames }: StatsClientProps) {
  const [filter, setFilter] = useState<StatsFilter>({});

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

  const stats = useMemo(
    () => computeMemberStats(filteredEvents, players),
    [filteredEvents, players]
  );

  const timeline = useMemo(
    () => buildCumulativeTimeline(filteredEvents, players),
    [filteredEvents, players]
  );

  return (
    <div className="min-w-0 space-y-6">
      <StatsFilters
        gameNames={gameNames}
        players={players}
        filter={filter}
        onChange={setFilter}
      />

      <StatsTable stats={stats} />
      <StatsCharts stats={stats} timeline={timeline} />
    </div>
  );
}
