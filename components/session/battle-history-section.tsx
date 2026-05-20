"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import type { ArenaHistoryItem } from "@/lib/actions/arena";
import { ARENA_BATTLES_PAGE_SIZE } from "@/lib/arena-battles-page";
import {
  findSeriesByKey,
  groupHistoryBySeries,
} from "@/lib/arena-history-series";
import { BattleHistoryPanel } from "./battle-history-panel";
import { BattleHistorySeriesPanel } from "./battle-history-series-panel";
import { SeriesDetailView } from "./series-detail-view";

export type HistoryListMode = "battles" | "series";

export type BattleHistoryInfiniteScroll = {
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<void>;
  /** Сброс видимого окна при обновлении списка */
  resetKey: number;
};

type BattleHistorySectionProps = {
  history: ArenaHistoryItem[];
  currentUserId: string | null;
  onSelect: (sessionId: string) => void;
  infiniteScroll?: BattleHistoryInfiniteScroll;
  onSeriesOpenChange?: (open: boolean) => void;
};

export function BattleHistorySection({
  history,
  currentUserId,
  onSelect,
  infiniteScroll,
  onSeriesOpenChange,
}: BattleHistorySectionProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listMode, setListMode] = useState<HistoryListMode>("battles");
  const [seriesKey, setSeriesKey] = useState<string | null>(null);

  useEffect(() => {
    onSeriesOpenChange?.(seriesKey != null);
  }, [seriesKey, onSeriesOpenChange]);
  const [visibleCount, setVisibleCount] = useState(ARENA_BATTLES_PAGE_SIZE);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (infiniteScroll) {
      setVisibleCount(ARENA_BATTLES_PAGE_SIZE);
    }
  }, [infiniteScroll?.resetKey, infiniteScroll]);

  const seriesList = useMemo(() => groupHistoryBySeries(history), [history]);

  const selectedSeries = useMemo(
    () => (seriesKey ? findSeriesByKey(history, seriesKey) : undefined),
    [history, seriesKey]
  );

  const fullBattlesList = history;
  const fullSeriesList = seriesList;

  const battlesTotalAll = infiniteScroll?.totalCount ?? history.length;
  const battlesTotalLoaded = history.length;
  const seriesTotalLoaded = fullSeriesList.length;

  const totalForMode =
    listMode === "battles" ? battlesTotalAll : seriesTotalLoaded;

  const applyVisibleSlice = useCallback(
    <T,>(list: T[]) => {
      if (!infiniteScroll || seriesKey) return list;
      return list.slice(0, visibleCount);
    },
    [infiniteScroll, seriesKey, visibleCount]
  );

  const battlesToShow = useMemo(
    () => applyVisibleSlice(fullBattlesList),
    [applyVisibleSlice, fullBattlesList]
  );

  const seriesToShow = useMemo(() => {
    if (!infiniteScroll || seriesKey) return fullSeriesList;
    return fullSeriesList.slice(0, visibleCount);
  }, [fullSeriesList, infiniteScroll, seriesKey, visibleCount]);

  const shownCount =
    listMode === "battles"
      ? Math.min(visibleCount, battlesToShow.length)
      : Math.min(visibleCount, seriesToShow.length);

  const showCounter =
    infiniteScroll &&
    !seriesKey &&
    (listMode === "battles"
      ? battlesTotalAll > ARENA_BATTLES_PAGE_SIZE
      : seriesTotalLoaded > 0 &&
        (seriesTotalLoaded > ARENA_BATTLES_PAGE_SIZE ||
          seriesTotalLoaded < battlesTotalAll));

  const canRevealMore =
    listMode === "battles"
      ? visibleCount < battlesTotalAll
      : visibleCount < seriesTotalLoaded || infiniteScroll?.hasMore === true;

  const revealMore = useCallback(async () => {
    if (!infiniteScroll || loadingRef.current) return;
    if (!canRevealMore && !infiniteScroll.hasMore) return;

    const nextVisible = Math.min(
      visibleCount + ARENA_BATTLES_PAGE_SIZE,
      totalForMode
    );
    if (nextVisible <= visibleCount) return;

    const needFetch =
      listMode === "battles"
        ? nextVisible > history.length && infiniteScroll.hasMore
        : infiniteScroll.hasMore &&
          (nextVisible > seriesTotalLoaded || visibleCount >= seriesTotalLoaded);

    if (needFetch) {
      loadingRef.current = true;
      try {
        await infiniteScroll.onLoadMore();
      } finally {
        loadingRef.current = false;
      }
    }

    setVisibleCount(nextVisible);
  }, [
    infiniteScroll,
    canRevealMore,
    visibleCount,
    totalForMode,
    listMode,
    history.length,
    seriesTotalLoaded,
  ]);

  useEffect(() => {
    if (!infiniteScroll || seriesKey) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void revealMore();
        }
      },
      { rootMargin: "160px", threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    infiniteScroll,
    seriesKey,
    revealMore,
    battlesToShow.length,
    seriesToShow.length,
    listMode,
  ]);

  const handleModeChange = (mode: HistoryListMode) => {
    setListMode(mode);
    setSeriesKey(null);
    const nextTotal =
      mode === "battles"
        ? battlesTotalAll
        : groupHistoryBySeries(history).length;
    setVisibleCount(Math.min(ARENA_BATTLES_PAGE_SIZE, nextTotal));
  };

  if (seriesKey && selectedSeries) {
    return (
      <SeriesDetailView
        series={selectedSeries}
        currentUserId={currentUserId}
        onBack={() => setSeriesKey(null)}
        onSelectBattle={onSelect}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            filtersOpen
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          }`}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Фильтры
        </button>
        {showCounter && (
          <span className="text-xs font-medium tabular-nums text-violet-400">
            {shownCount} из {totalForMode}
          </span>
        )}
      </div>

      {filtersOpen && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-500">Показать</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("battles")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                listMode === "battles"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              По сражениям
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("series")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                listMode === "series"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              По сериям
            </button>
          </div>
          {listMode === "series" && (
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Серия — одна игра и один и тот же состав игроков. Другая игра или
              другой состав — отдельная серия.
            </p>
          )}
        </div>
      )}

      {listMode === "battles" ? (
        <BattleHistoryPanel history={battlesToShow} onSelect={onSelect} />
      ) : (
        <BattleHistorySeriesPanel
          series={seriesToShow}
          onSelectSeries={setSeriesKey}
        />
      )}

      {infiniteScroll && !seriesKey && (canRevealMore || infiniteScroll.hasMore) && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-3"
          aria-hidden
        >
          {infiniteScroll.loading ? (
            <span className="text-xs text-zinc-500">Загрузка…</span>
          ) : (
            <span className="text-xs text-zinc-600">Прокрутите ниже</span>
          )}
        </div>
      )}
    </div>
  );
}
