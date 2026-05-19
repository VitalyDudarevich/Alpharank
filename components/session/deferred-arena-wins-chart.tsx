"use client";

import { memo } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ArenaWinsChart } from "./arena-wins-chart";
import type { SessionScoreEvent } from "@/lib/session-stats";

const CHART_DEBOUNCE_MS = 2000;

type DeferredArenaWinsChartProps = {
  events: SessionScoreEvent[];
  memberNames: Record<string, string>;
  memberIds: string[];
  gameId: string;
};

export const DeferredArenaWinsChart = memo(function DeferredArenaWinsChart({
  events,
  memberNames,
  memberIds,
  gameId,
}: DeferredArenaWinsChartProps) {
  const debouncedEvents = useDebouncedValue(events, CHART_DEBOUNCE_MS);

  return (
    <ArenaWinsChart
      events={debouncedEvents}
      memberNames={memberNames}
      memberIds={memberIds}
      gameId={gameId}
    />
  );
});
