"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchStandaloneArenaState,
  type StandaloneArenaHistoryItem,
} from "@/lib/actions/standalone-arena";
import { StandaloneActiveBattleView } from "@/components/session/standalone-active-battle-view";
import { StandaloneBattleSetupDialog } from "@/components/session/standalone-battle-setup-dialog";
import { BattleHistoryPanel } from "@/components/session/battle-history-panel";
import { Button } from "@/components/ui/button";
import type { BattleParticipant } from "@/lib/types";
import type { SessionLogEvent } from "@/components/session/session-event-log";
import type { SessionScoreEvent } from "@/lib/session-stats";
import type { ArenaHistoryItem } from "@/lib/actions/arena";
import { ArenaPageHeader } from "@/components/layout/arena-page-header";
import { appMainClass, appPageClass, appPageContentClass } from "@/lib/layout-page";

type ViewMode = "idle" | "active";

export function StandaloneArenaClient({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("idle");
  const [history, setHistory] = useState<StandaloneArenaHistoryItem[]>([]);

  const [sessionId, setSessionId] = useState("");
  const [gameName, setGameName] = useState("");
  const [participants, setParticipants] = useState<BattleParticipant[]>([]);
  const [sessionScoreEvents, setSessionScoreEvents] = useState<SessionScoreEvent[]>(
    []
  );
  const [logEvents, setLogEvents] = useState<SessionLogEvent[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const loadSessionEvents = useCallback(
    async (sid: string, parts: BattleParticipant[]) => {
      const supabase = createClient();
      const { data: events } = await supabase
        .from("score_events")
        .select(
          "id, winner_member_id, winner_participant_id, participant_ids, game_id, created_at, created_by, deleted_at"
        )
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      const memberNames = Object.fromEntries(
        parts.map((p) => [p.id, p.display_name])
      );

      const actorIds = [...new Set((events ?? []).map((e) => e.created_by))];
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
        winner_member_id: e.winner_member_id,
        winner_participant_id: e.winner_participant_id,
        participant_ids: e.participant_ids,
        game_id: e.game_id,
        created_at: e.created_at,
        created_by: e.created_by,
        deleted_at: e.deleted_at,
      }));
      setSessionScoreEvents(scoreEvents);

      setLogEvents(
        (events ?? [])
          .filter((e) => !e.deleted_at)
          .map((e) => {
            const winnerId =
              e.winner_participant_id ?? e.winner_member_id ?? "";
            return {
              id: e.id,
              winner_member_id: winnerId,
              winner_name: memberNames[winnerId] ?? "?",
              actor_name: names[e.created_by] ?? "Участник",
              created_by: e.created_by,
              created_at: e.created_at,
              deleted_at: e.deleted_at,
            };
          })
          .reverse()
      );
    },
    []
  );

  const reloadArena = useCallback(async () => {
    const arena = await fetchStandaloneArenaState();

    if ("error" in arena) {
      setReady(true);
      return;
    }

    setHistory(arena.history);

    if (arena.activeSession && arena.participants.length > 0) {
      const sid = arena.activeSession.id;
      setSessionId(sid);
      setGameName(arena.activeSession.game_name);
      setParticipants(arena.participants);
      setStartedAt(arena.activeSession.started_at);
      setView("active");
      await loadSessionEvents(sid, arena.participants);
    } else {
      setView("idle");
    }

    setReady(true);
  }, [loadSessionEvents]);

  useEffect(() => {
    setReady(false);
    void reloadArena();
  }, [reloadArena]);

  const historyForPanel: ArenaHistoryItem[] = history.map((h) => ({
    id: h.id,
    game_id: null,
    game_name: h.game_name,
    session_date: h.session_date,
    started_at: h.started_at,
    ended_at: h.ended_at,
    participant_count: h.participant_count,
    event_count: h.event_count,
  }));

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

  return (
    <main className={cn(appPageClass, "pb-8")}>
      <div className={cn(appPageContentClass, appMainClass)}>
      <ArenaPageHeader
        right={
          <>
            <Link
              href="/"
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Назад
            </Link>
            {view === "idle" && (
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => setSetupOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Сражение
              </Button>
            )}
          </>
        }
      />

      {view === "active" && sessionId && (
        <StandaloneActiveBattleView
          sessionId={sessionId}
          gameName={gameName}
          participants={participants}
          sessionScoreEvents={sessionScoreEvents}
          logEvents={logEvents}
          actorNames={actorNames}
          currentUserId={userId}
          startedAt={startedAt}
          onEnded={() => {
            setView("idle");
            void reloadArena();
          }}
        />
      )}

      {view === "idle" && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-12 text-center">
            <Swords className="mx-auto mb-4 h-12 w-12 text-violet-400/60" />
            <p className="mb-2 font-medium text-zinc-200">
              Нет активного сражения
            </p>
            <p className="mb-6 text-sm text-zinc-500">
              Укажите игру и участников — лига не нужна
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

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-400">
                История
              </h2>
              <BattleHistoryPanel
                history={historyForPanel.slice(0, 5)}
                onSelect={() => {}}
              />
            </section>
          )}
        </div>
      )}

      </div>

      <StandaloneBattleSetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onStarted={() => {
          void reloadArena();
        }}
      />
    </main>
  );
}
