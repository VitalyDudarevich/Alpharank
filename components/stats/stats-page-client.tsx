"use client";

import { useEffect, useState } from "react";
import { fetchUserStatsData } from "@/lib/actions/stats-data";
import { StatsClient } from "@/components/stats/stats-client";
import { AppPageHeader } from "@/components/layout/app-page-header";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";
import { cn } from "@/lib/utils";
import type { ScoreEvent, StatsPlayer } from "@/lib/types";

export function StatsPageClient() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [players, setPlayers] = useState<StatsPlayer[]>([]);
  const [gameNames, setGameNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchUserStatsData().then((data) => {
      if (cancelled) return;
      if ("error" in data) {
        setLoading(false);
        return;
      }
      setEvents(data.events);
      setPlayers(data.players);
      setGameNames(data.gameNames);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={appPageClass}>
      <div className={cn(appPageContentClass, appMainClass)}>
        <AppPageHeader title="Статистика" />

        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Пока нет записанных побед. Сыграйте сражение на арене.
          </p>
        ) : (
          <StatsClient events={events} players={players} gameNames={gameNames} />
        )}
      </div>
    </main>
  );
}
