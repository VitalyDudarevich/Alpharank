"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchActiveBattle,
  fetchArenaState,
  fetchMoreArenaBattles,
  type ArenaHistoryItem,
} from "@/lib/actions/arena";
import { StandaloneActiveBattleView } from "@/components/session/standalone-active-battle-view";
import { StandaloneBattleSetupDialog } from "@/components/session/standalone-battle-setup-dialog";
import { BattleHistorySection } from "@/components/session/battle-history-section";
import { BattleDetailView } from "@/components/session/battle-detail-view";
import { Button } from "@/components/ui/button";
import type { BattleParticipant } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";
import { ArenaPageHeader } from "@/components/layout/arena-page-header";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";

export function ArenaPageClient({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [battles, setBattles] = useState<ArenaHistoryItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState("");
  const [gameName, setGameName] = useState("");
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [sessionScoreEvents, setSessionScoreEvents] = useState<SessionScoreEvent[]>(
    []
  );
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [totalBattlesCount, setTotalBattlesCount] = useState(0);
  const [endedOffset, setEndedOffset] = useState(0);
  const [hasMoreBattles, setHasMoreBattles] = useState(false);
  const [loadingMoreBattles, setLoadingMoreBattles] = useState(false);
  const [listResetKey, setListResetKey] = useState(0);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  const loadSessionEvents = useCallback(
    async (sid: string) => {
      const supabase = createClient();
      const { data: events } = await supabase
        .from("score_events")
        .select(
          "id, winner_participant_id, participant_ids, created_at, created_by, deleted_at"
        )
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      const actorIds = [
        ...new Set(
          (events ?? [])
            .map((e) => e.created_by)
            .filter((id): id is string => !!id)
        ),
      ];
      const names: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", actorIds);
        for (const p of profiles ?? []) {
          names[p.id] = p.display_name;
        }
      }
      setActorNames(names);

      const scoreEvents: SessionScoreEvent[] = (events ?? []).map((e) => ({
        id: e.id,
        winner_member_id: null,
        winner_participant_id: e.winner_participant_id,
        participant_ids: e.participant_ids,
        game_id: null,
        created_at: e.created_at,
        created_by: e.created_by,
        deleted_at: e.deleted_at,
      }));
      setSessionScoreEvents(scoreEvents);
    },
    []
  );

  const openActiveBattle = useCallback(
    async (sid: string) => {
      const battle = await fetchActiveBattle(sid);
      if ("error" in battle) return false;

      await loadSessionEvents(sid);
      setSessionId(battle.id);
      setGameName(battle.game_name);
      setParticipants(battle.participants);
      setStartedAt(battle.started_at);
      setActiveSessionId(battle.id);
      return true;
    },
    [loadSessionEvents]
  );

  const applyBattlesPage = useCallback(
    (arena: {
      battles: ArenaHistoryItem[];
      totalCount: number;
      endedOffset: number;
      hasMore: boolean;
    }) => {
      setBattles(arena.battles);
      setTotalBattlesCount(arena.totalCount);
      setEndedOffset(arena.endedOffset);
      setHasMoreBattles(arena.hasMore);
      setListResetKey((k) => k + 1);
    },
    []
  );

  const refreshBattlesList = useCallback(async () => {
    const arena = await fetchArenaState();
    if ("error" in arena) return;
    applyBattlesPage(arena);
  }, [applyBattlesPage]);

  const loadMoreBattles = useCallback(async () => {
    if (loadingMoreBattles || !hasMoreBattles) return;
    setLoadingMoreBattles(true);
    try {
      const page = await fetchMoreArenaBattles(endedOffset);
      if ("error" in page) return;
      setBattles((prev) => {
        const ids = new Set(prev.map((b) => b.id));
        const next = page.battles.filter((b) => !ids.has(b.id));
        return [...prev, ...next];
      });
      setEndedOffset(page.endedOffset);
      setHasMoreBattles(page.hasMore);
      setTotalBattlesCount(page.totalCount);
    } finally {
      setLoadingMoreBattles(false);
    }
  }, [endedOffset, hasMoreBattles, loadingMoreBattles]);

  const reloadArena = useCallback(async () => {
    const arena = await fetchArenaState();

    if ("error" in arena) {
      setReady(true);
      return;
    }

    applyBattlesPage(arena);

    const currentActiveId = activeSessionIdRef.current;
    if (currentActiveId) {
      const stillActive = arena.battles.some(
        (b) => b.id === currentActiveId && b.status === "active"
      );
      if (stillActive) {
        await openActiveBattle(currentActiveId);
      } else {
        setActiveSessionId(null);
      }
    }

    setReady(true);
  }, [applyBattlesPage, openActiveBattle]);

  useEffect(() => {
    setReady(false);
    void reloadArena();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при монтировании
  }, []);

  const handleSelectBattle = useCallback(
    async (id: string) => {
      const item = battles.find((b) => b.id === id);
      if (item?.status === "active") {
        await openActiveBattle(id);
        return;
      }
      setDetailSessionId(id);
    },
    [battles, openActiveBattle]
  );

  const activeCount = battles.filter((b) => b.status === "active").length;

  if (!ready) {
    return (
      <main className={appPageClass}>
        <div className={cn(appPageContentClass, appMainClass)}>
          <ArenaPageHeader />
          <p className="mb-6 text-center text-sm text-zinc-400">Загрузка…</p>
        </div>
      </main>
    );
  }

  const showHome = !activeSessionId && !detailSessionId;
  const showActive = activeSessionId && sessionId && !detailSessionId;
  const showCreateBattle = showHome && !seriesOpen;

  return (
    <main className={cn(appPageClass, "pb-8")}>
      <div className={cn(appPageContentClass, appMainClass)}>
        <ArenaPageHeader
          right={
            showCreateBattle ? (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setSetupOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Сражение
              </Button>
            ) : null
          }
        />

        {detailSessionId && (
          <BattleDetailView
            sessionId={detailSessionId}
            currentUserId={userId}
            onBack={() => {
              setDetailSessionId(null);
              void refreshBattlesList();
            }}
          />
        )}

        {showActive && (
          <StandaloneActiveBattleView
            sessionId={sessionId}
            gameName={gameName}
            participants={participants}
            sessionScoreEvents={sessionScoreEvents}
            actorNames={actorNames}
            currentUserId={userId}
            startedAt={startedAt}
            onBack={() => {
              setActiveSessionId(null);
              void refreshBattlesList();
            }}
            onEnded={() => {
              activeSessionIdRef.current = null;
              setActiveSessionId(null);
              void reloadArena();
            }}
          />
        )}

        {showHome && (
          <div className="space-y-8">
            {totalBattlesCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
                <Swords className="mx-auto mb-4 h-12 w-12 text-violet-400/60" />
                <p className="mb-2 font-medium text-zinc-200">
                  Нет сражений
                </p>
                <p className="mb-6 text-sm text-zinc-500">
                  Создайте сражение — можно вести несколько серий параллельно
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full max-w-xs"
                  onClick={() => setSetupOpen(true)}
                >
                  Создать сражение
                </Button>
              </div>
            ) : (
              <section>
                <h2 className="mb-3 text-sm font-medium text-zinc-400">
                  {activeCount > 0
                    ? `Сражения · ${activeCount} активных`
                    : "История"}
                </h2>
                <BattleHistorySection
                  history={battles}
                  currentUserId={userId}
                  onSelect={(id) => void handleSelectBattle(id)}
                  onSeriesOpenChange={setSeriesOpen}
                  infiniteScroll={{
                    totalCount: totalBattlesCount,
                    hasMore: hasMoreBattles,
                    loading: loadingMoreBattles,
                    onLoadMore: loadMoreBattles,
                    resetKey: listResetKey,
                  }}
                />
              </section>
            )}
          </div>
        )}
      </div>

      <StandaloneBattleSetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onStarted={(newSessionId) => {
          void (async () => {
            await reloadArena();
            await openActiveBattle(newSessionId);
          })();
        }}
      />

    </main>
  );
}
