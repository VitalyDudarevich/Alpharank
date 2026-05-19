"use client";

import { useState } from "react";
import { ParticipantPicker } from "./participant-picker";
import { GameTabs } from "./game-tabs";
import { QuickWinGrid } from "./quick-win-grid";
import { EventFeed } from "./event-feed";
import type { Game, LeagueMember } from "@/lib/types";

interface TodayClientProps {
  leagueId: string;
  sessionId: string;
  games: Game[];
  allMembers: LeagueMember[];
  selectedParticipantIds: string[];
  winCounts: Record<string, number>;
  feedEvents: {
    id: string;
    winner_name: string;
    game_name: string;
    actor_name: string;
    created_at: string;
    created_by: string;
  }[];
  currentUserId: string;
}

export function TodayClient({
  leagueId,
  sessionId,
  games,
  allMembers,
  selectedParticipantIds,
  winCounts,
  feedEvents,
  currentUserId,
}: TodayClientProps) {
  const [activeGameId, setActiveGameId] = useState(games[0]?.id ?? "");

  const participants = allMembers.filter((m) =>
    selectedParticipantIds.includes(m.id)
  );

  const activeGame = games.find((g) => g.id === activeGameId);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Кто играет сегодня</h2>
        <ParticipantPicker
          leagueId={leagueId}
          sessionId={sessionId}
          allMembers={allMembers}
          selectedIds={selectedParticipantIds}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Игра</h2>
        <GameTabs
          games={games}
          activeId={activeGameId}
          onChange={setActiveGameId}
        />
      </section>

      {activeGame && (
        <section>
          <h2 className="mb-3 text-center text-lg font-bold text-zinc-100">
            {activeGame.name}
          </h2>
          <QuickWinGrid
            leagueId={leagueId}
            sessionId={sessionId}
            gameId={activeGameId}
            participants={participants}
            winCounts={winCounts}
          />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Лента</h2>
        <EventFeed
          leagueId={leagueId}
          initialEvents={feedEvents}
          currentUserId={currentUserId}
        />
      </section>
    </div>
  );
}
