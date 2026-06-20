"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { buildMemberColorMap } from "@/lib/player-colors";
import { filterSessionEventsByGame } from "@/lib/arena-games";
import {
  computePlayerTimelines,
  computeSessionPoints,
  computeSmartPlayerTimelines,
  countSmartRoundsPlayed,
  type SessionScoreEvent,
} from "@/lib/session-stats";
import type { ScoringMode } from "@/lib/types";

interface ArenaWinsChartProps {
  events: SessionScoreEvent[];
  memberNames: Record<string, string>;
  memberIds: string[];
  gameId: string | null;
  scoringMode?: ScoringMode;
  participantSlots?: number | null;
}

export const ArenaWinsChart = memo(function ArenaWinsChart({
  events,
  memberNames,
  memberIds,
  gameId,
  scoringMode = "classic",
  participantSlots = null,
}: ArenaWinsChartProps) {
  const isSmart = scoringMode === "smart";
  const slots = participantSlots ?? memberIds.length;
  const yLabel = isSmart ? "Очки" : "Победы";
  const emptyMessage = isSmart
    ? "График появится после первого раунда"
    : "График появится после первой победы";

  const colorMap = useMemo(() => buildMemberColorMap(memberIds), [memberIds]);

  const filteredEvents = useMemo(
    () => filterSessionEventsByGame(events, gameId),
    [events, gameId]
  );

  const pointTotals = useMemo(
    () => (isSmart ? computeSessionPoints(filteredEvents, slots) : {}),
    [isSmart, filteredEvents, slots]
  );

  const timelines = useMemo(
    () =>
      isSmart
        ? computeSmartPlayerTimelines(filteredEvents, memberIds, slots)
        : computePlayerTimelines(filteredEvents, memberIds),
    [filteredEvents, memberIds, isSmart, slots]
  );

  const chartPlayers = memberIds
    .map((memberId) => {
      const points = timelines[memberId] ?? [{ games: 0, wins: 0 }];
      const last = points[points.length - 1];
      return {
        memberId,
        name: memberNames[memberId] ?? "?",
        color: colorMap[memberId] ?? "#8b5cf6",
        points,
        wins: last.wins,
        games: last.games,
      };
    })
    .filter((p) => p.games > 0 || p.wins > 0);

  const maxGames = Math.max(
    1,
    ...chartPlayers.map((p) => p.points[p.points.length - 1]?.games ?? 0)
  );
  const maxWins = Math.max(
    1,
    ...chartPlayers.map((p) => p.points[p.points.length - 1]?.wins ?? 0)
  );

  const hasActivity = chartPlayers.some((p) => p.points.length > 1);

  if (!hasActivity) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="games"
              name={isSmart ? "Раунды" : "Игры"}
              allowDecimals={false}
              domain={[0, maxGames + 0.5]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{
                value: isSmart ? "Раунды" : "Игры",
                position: "insideBottom",
                offset: -2,
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <YAxis
              type="number"
              dataKey="wins"
              name={yLabel}
              allowDecimals={false}
              domain={[0, maxWins + 0.5]}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
              }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#52525b" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as {
                  games: number;
                  wins: number;
                };
                const name = (payload[0] as { name?: string }).name ?? "";
                return (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm shadow-lg">
                    {name && (
                      <p className="font-medium text-zinc-100">{name}</p>
                    )}
                    <p className="text-zinc-400">
                      {isSmart ? "Очков" : "Побед"}: {p.wins}
                      {isSmart ? ` · Раунд: ${p.games}` : ` · Игр: ${p.games}`}
                    </p>
                  </div>
                );
              }}
            />
            {chartPlayers.map((player) => (
              <Scatter
                key={player.memberId}
                name={player.name}
                data={player.points}
                fill={player.color}
                line={{
                  stroke: player.color,
                  strokeWidth: 2,
                }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-2">
        {memberIds.map((id) => {
          const points = timelines[id] ?? [{ games: 0, wins: 0 }];
          const last = points[points.length - 1];
          const name = memberNames[id] ?? "?";
          const legendPoints = isSmart ? (pointTotals[id] ?? 0) : last.wins;
          const legendGames = isSmart
            ? countSmartRoundsPlayed(filteredEvents, id)
            : last.games;
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colorMap[id] }}
                />
                <span className="truncate text-zinc-200">{name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {legendPoints} {isSmart ? "оч" : "поб"} · {legendGames} игр
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
