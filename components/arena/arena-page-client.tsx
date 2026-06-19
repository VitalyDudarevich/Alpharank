"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Loader2, LogIn, Plus, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import {
  fetchActiveBattle,
  fetchArenaState,
  fetchMoreArenaBattles,
  type ArenaBattlesPage,
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
import {
  appAboveBottomNavClass,
  appBottomActionClearanceClass,
  appMainClass,
  appPageClass,
  appPageContentClass,
} from "@/lib/layout-page";

type ArenaPageClientProps = {
  userId: string | null;
  initialBattleId?: string | null;
  initialArena?: ArenaBattlesPage | null;
};

// Сбрасывается при полной перезагрузке страницы. На первом маунте серверные
// initial-данные свежие — фоновую ревалидацию пропускаем. При последующих
// маунтах (клиентская навигация назад на арену) данные могут быть из router
// cache, поэтому тихо обновляем их в фоне.
let arenaHydratedOnce = false;

export function ArenaPageClient({
  userId,
  initialBattleId = null,
  initialArena = null,
}: ArenaPageClientProps) {
  const isGuest = userId === null;
  const router = useRouter();
  // С серверными initial-данными список готов сразу — без «Загрузка…» и без
  // отдельного запроса на маунте.
  const [ready, setReady] = useState(!!initialArena);
  const [setupOpen, setSetupOpen] = useState(false);
  const [battles, setBattles] = useState<ArenaHistoryItem[]>(
    initialArena?.battles ?? []
  );
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
  const [totalBattlesCount, setTotalBattlesCount] = useState(
    initialArena?.totalCount ?? 0
  );
  const [endedOffset, setEndedOffset] = useState(initialArena?.endedOffset ?? 0);
  const [hasMoreBattles, setHasMoreBattles] = useState(
    initialArena?.hasMore ?? false
  );
  const [loadingMoreBattles, setLoadingMoreBattles] = useState(false);
  const [listResetKey, setListResetKey] = useState(0);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const activeSessionIdRef = useRef<string | null>(null);
  const openActiveRequestRef = useRef(0);
  activeSessionIdRef.current = activeSessionId;

  const syncBattleUrl = useCallback(
    (id: string | null) => {
      router.replace(
        id ? `/?battle=${encodeURIComponent(id)}` : "/",
        { scroll: false }
      );
    },
    [router]
  );

  const loadSessionEvents = useCallback(async (sid: string) => {
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
  }, []);

  const openActiveBattle = useCallback(
    async (sid: string) => {
      const requestId = ++openActiveRequestRef.current;
      activeSessionIdRef.current = sid;

      const battle = await fetchActiveBattle(sid);
      if (requestId !== openActiveRequestRef.current) return false;
      if ("error" in battle) return false;

      await loadSessionEvents(sid);
      if (requestId !== openActiveRequestRef.current) return false;

      setSessionId(battle.id);
      setGameName(battle.game_name);
      setParticipants(battle.participants);
      setStartedAt(battle.started_at);
      setActiveSessionId(battle.id);
      setDetailSessionId(null);
      syncBattleUrl(sid);
      return true;
    },
    [loadSessionEvents, syncBattleUrl]
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

  // Сервер прислал свежие данные (после revalidatePath из server action —
  // завершение/удаление боя обновляют страницу «/»). Клиент инициализирует
  // состояние из initialArena только на маунте, поэтому без этой синхронизации
  // автоматически открывшаяся арена осталась бы устаревшей.
  const lastInitialArenaRef = useRef(initialArena);
  useEffect(() => {
    if (initialArena && initialArena !== lastInitialArenaRef.current) {
      lastInitialArenaRef.current = initialArena;
      applyBattlesPage(initialArena);
    }
  }, [initialArena, applyBattlesPage]);

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
    if (currentActiveId && userId) {
      const stillActive = arena.battles.some(
        (b) => b.id === currentActiveId && b.status === "active"
      );
      if (stillActive) {
        await openActiveBattle(currentActiveId);
      } else {
        setActiveSessionId(null);
        setSessionId("");
      }
    }

    setReady(true);
  }, [applyBattlesPage, openActiveBattle, userId]);

  useEffect(() => {
    setDeepLinkHandled(false);
    if (initialArena) {
      // Показываем серверные данные сразу (без «Загрузка…»). На первом маунте
      // они свежие; при возврате на арену клиентской навигацией — тихо
      // ревалидируем в фоне, чтобы список не оставался устаревшим.
      setReady(true);
      if (arenaHydratedOnce) {
        void refreshBattlesList();
      }
      arenaHydratedOnce = true;
      return;
    }
    setReady(false);
    arenaHydratedOnce = true;
    void reloadArena();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount
  }, []);

  // Возврат на вкладку/в PWA → подтянуть свежий список (на том же устройстве
  // изменения видны сразу, без перезахода).
  useEffect(() => {
    const revalidateOnVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshBattlesList();
      }
    };
    window.addEventListener("visibilitychange", revalidateOnVisible);
    window.addEventListener("focus", revalidateOnVisible);
    return () => {
      window.removeEventListener("visibilitychange", revalidateOnVisible);
      window.removeEventListener("focus", revalidateOnVisible);
    };
  }, [refreshBattlesList]);

  const handleSelectBattle = useCallback(
    async (id: string) => {
      const item = battles.find((b) => b.id === id);
      if (item?.status === "active") {
        activeSessionIdRef.current = id;
        setActiveSessionId(id);
        await openActiveBattle(id);
        return;
      }
      setActiveSessionId(null);
      setSessionId("");
      setDetailSessionId(id);
      syncBattleUrl(id);
    },
    [battles, openActiveBattle, syncBattleUrl]
  );

  useEffect(() => {
    if (!ready || deepLinkHandled || !initialBattleId) return;
    setDeepLinkHandled(true);
    void handleSelectBattle(initialBattleId);
  }, [ready, deepLinkHandled, initialBattleId, handleSelectBattle]);

  const detailBattle = detailSessionId
    ? battles.find((b) => b.id === detailSessionId)
    : undefined;
  const canDeleteDetail =
    !!userId &&
    !!detailBattle &&
    detailBattle.created_by === userId;

  const backToArena = useCallback(() => {
    openActiveRequestRef.current += 1;
    setActiveSessionId(null);
    setDetailSessionId(null);
    setSessionId("");
    activeSessionIdRef.current = null;
    syncBattleUrl(null);
    void refreshBattlesList();
  }, [refreshBattlesList, syncBattleUrl]);

  const activeCount = battles.filter((b) => b.status === "active").length;

  const loginHref = useMemo(() => {
    const id = detailSessionId || activeSessionId;
    const dest = id ? `/?battle=${encodeURIComponent(id)}` : "/";
    return `/login?redirect=${encodeURIComponent(dest)}`;
  }, [detailSessionId, activeSessionId]);

  // Pull-to-refresh активен только на главном списке (не во вью боя/детали).
  const { pullDistance, refreshing } = usePullToRefresh({
    onRefresh: reloadArena,
    enabled: ready && !activeSessionId && !detailSessionId,
  });

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
  const showActive = !!(activeSessionId && sessionId && !detailSessionId);
  const canEditActive = !!userId && showActive;
  const canDeleteActive =
    !!userId &&
    showActive &&
    battles.find((b) => b.id === sessionId)?.created_by === userId;
  const showBottomBar = showHome && !seriesOpen;
  const showArenaAddBattle = showBottomBar && !isGuest;
  const showArenaLogin = showBottomBar && isGuest;

  const guestBottomClass =
    "max-md:bottom-[calc(1rem+env(safe-area-inset-bottom))]";

  return (
    <main
      className={cn(
        appPageClass,
        showBottomBar &&
          (isGuest ? "max-md:pb-28" : appBottomActionClearanceClass),
      )}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
          style={{ transform: `translateY(${Math.max(pullDistance - 8, 0)}px)` }}
        >
          <div className="mt-[calc(env(safe-area-inset-top)+0.5rem)] flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/95 shadow-lg">
            <Loader2
              className={cn("h-5 w-5 text-violet-400", refreshing && "animate-spin")}
              style={
                refreshing
                  ? undefined
                  : {
                      transform: `rotate(${pullDistance * 3}deg)`,
                      opacity: Math.min(pullDistance / 70, 1),
                    }
              }
            />
          </div>
        </div>
      )}

      <div className={cn(appPageContentClass, appMainClass)}>
        <ArenaPageHeader />

        {isGuest && showHome && (
          <p className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center text-sm text-zinc-400">
            Режим просмотра.{" "}
            <Link
              href={loginHref}
              className="font-medium text-violet-400 underline decoration-violet-500/50 underline-offset-2 transition-colors hover:text-violet-300"
            >
              Войдите
            </Link>
            , чтобы создавать сражения и вести счёт.
          </p>
        )}

        {detailSessionId && (
          <BattleDetailView
            sessionId={detailSessionId}
            currentUserId={userId}
            canDelete={canDeleteDetail}
            onBack={backToArena}
            onDeleted={
              userId
                ? () => {
                    const id = detailSessionId;
                    setDetailSessionId(null);
                    syncBattleUrl(null);
                    if (id) {
                      // Оптимистично убираем из списка сразу, reloadArena ниже
                      // сверит с сервером.
                      setBattles((prev) => prev.filter((b) => b.id !== id));
                      setTotalBattlesCount((c) => Math.max(0, c - 1));
                    }
                    void reloadArena();
                  }
                : undefined
            }
          />
        )}

        {showActive && (
          <StandaloneActiveBattleView
            key={sessionId}
            sessionId={sessionId}
            gameName={gameName}
            participants={participants}
            sessionScoreEvents={sessionScoreEvents}
            actorNames={actorNames}
            currentUserId={userId}
            startedAt={startedAt}
            readOnly={!canEditActive}
            canDelete={canDeleteActive}
            onBack={backToArena}
            onEnded={
              canEditActive
                ? () => {
                    const id = sessionId;
                    activeSessionIdRef.current = null;
                    setActiveSessionId(null);
                    setSessionId("");
                    syncBattleUrl(null);
                    if (id) {
                      // Оптимистично помечаем завершённым; reloadArena уточнит
                      // порядок и ended_at с сервера.
                      setBattles((prev) =>
                        prev.map((b) =>
                          b.id === id ? { ...b, status: "ended" as const } : b
                        )
                      );
                    }
                    void reloadArena();
                  }
                : undefined
            }
            onDeleted={
              canEditActive
                ? () => {
                    const id = sessionId;
                    activeSessionIdRef.current = null;
                    setActiveSessionId(null);
                    setSessionId("");
                    syncBattleUrl(null);
                    if (id) {
                      setBattles((prev) => prev.filter((b) => b.id !== id));
                      setTotalBattlesCount((c) => Math.max(0, c - 1));
                    }
                    void reloadArena();
                  }
                : undefined
            }
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
                <p className="text-sm text-zinc-500">
                  {isGuest
                    ? "Когда появятся сражения, они будут видны здесь."
                    : "Создайте сражение — можно вести несколько серий параллельно"}
                </p>
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

        {showArenaAddBattle && (
          <div
            className={cn(
              "z-40 mt-6 bg-gradient-to-t from-zinc-950 from-40% via-zinc-950/95 to-transparent pt-6",
              "max-md:fixed max-md:inset-x-0 max-md:mx-auto max-md:mt-0 max-md:max-w-lg max-md:px-4 max-md:pb-3 max-md:pt-4",
              appAboveBottomNavClass,
              "md:sticky md:bottom-0 md:pb-4",
            )}
          >
            <Button
              type="button"
              size="lg"
              className="h-12 w-full shadow-lg shadow-violet-950/50"
              onClick={() => setSetupOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Добавить сражение
            </Button>
          </div>
        )}

        {showArenaLogin && (
          <div
            className={cn(
              "z-40 mt-6 bg-gradient-to-t from-zinc-950 from-40% via-zinc-950/95 to-transparent pt-6",
              "max-md:fixed max-md:inset-x-0 max-md:mx-auto max-md:mt-0 max-md:max-w-lg max-md:px-4 max-md:pb-3 max-md:pt-4",
              guestBottomClass,
              "md:sticky md:bottom-0 md:pb-4",
            )}
          >
            <Link
              href={loginHref}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-base font-semibold text-white shadow-lg shadow-violet-950/50 transition-colors hover:bg-violet-500"
            >
              <LogIn className="h-5 w-5" />
              Войти
            </Link>
          </div>
        )}
      </div>

      {!isGuest && (
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
      )}
    </main>
  );
}
