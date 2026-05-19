"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ParticipantPicker } from "./participant-picker";
import { LeaguePicker } from "./league-picker";
import { GamePicker } from "./game-picker";
import { ArenaWinsChart } from "./arena-wins-chart";
import { EventFeed } from "./event-feed";
import { useSessionScoreEvents } from "./use-session-score-events";
import { buildMemberColorMap } from "@/lib/player-colors";
import {
  ALL_GAMES_ID,
  isAllGames,
  winCountsFromEvents,
} from "@/lib/arena-games";
import type { SessionScoreEvent } from "@/lib/session-stats";
import { LeagueSeasonBanner } from "./league-season-banner";
import {
  isGameLocked,
  isLeagueConcluded,
  type GameWinTotals,
  type MemberWinTotals,
} from "@/lib/league-season";
import type { Game, League, LeagueMember } from "@/lib/types";

interface TodayClientProps {
  leagueId: string;
  league: League;
  sessionId: string;
  games: Game[];
  memberTotals: MemberWinTotals;
  gameTotals: GameWinTotals;
  onTotalsChange?: (member: MemberWinTotals, game: GameWinTotals) => void;
  allMembers: LeagueMember[];
  selectedParticipantIds: string[];
  sessionScoreEvents: SessionScoreEvent[];
  feedEvents: {
    id: string;
    winner_name: string;
    game_name: string;
    actor_name: string;
    created_at: string;
    created_by: string;
  }[];
  currentUserId: string;
  eloEnabled: boolean;
  eloK: number;
}

export function TodayClient({
  leagueId,
  league,
  sessionId,
  games: initialGames,
  memberTotals,
  gameTotals,
  onTotalsChange,
  allMembers: initialAllMembers,
  selectedParticipantIds,
  sessionScoreEvents: initialSessionEvents,
  feedEvents,
  currentUserId,
  eloEnabled,
  eloK,
}: TodayClientProps) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [allMembers, setAllMembers] = useState(initialAllMembers);
  const [activeGameId, setActiveGameId] = useState(ALL_GAMES_ID);
  const [selectedIds, setSelectedIds] = useState(selectedParticipantIds);

  useEffect(() => {
    setAllMembers(initialAllMembers);
  }, [initialAllMembers]);

  useEffect(() => {
    setGames(initialGames);
    setActiveGameId((prev) => {
      if (prev === ALL_GAMES_ID) return ALL_GAMES_ID;
      if (prev && initialGames.some((g) => g.id === prev)) return prev;
      return ALL_GAMES_ID;
    });
  }, [initialGames]);

  const { events: sessionEvents } = useSessionScoreEvents({
    leagueId,
    sessionId,
    participantIds: selectedIds,
    initialEvents: initialSessionEvents,
  });

  const activeGame = games.find((g) => g.id === activeGameId);
  const isAll = isAllGames(activeGameId);

  const leagueConcluded = isLeagueConcluded(league, memberTotals);
  const gameLocked =
    !isAll &&
    activeGame &&
    isGameLocked(activeGame, gameTotals[activeGameId] ?? 0, leagueConcluded);
  const winsBlocked = leagueConcluded || !!gameLocked;

  const winCounts = useMemo(
    () => winCountsFromEvents(sessionEvents, activeGameId),
    [sessionEvents, activeGameId]
  );

  const memberNames = useMemo(
    () => Object.fromEntries(allMembers.map((m) => [m.id, m.display_name])),
    [allMembers]
  );
  const memberColors = useMemo(
    () => buildMemberColorMap(selectedIds),
    [selectedIds]
  );
  const gameNames = useMemo(
    () => Object.fromEntries(games.map((g) => [g.id, g.name])),
    [games]
  );

  const filteredFeedEvents = useMemo(() => {
    if (isAll) return feedEvents;
    const gameName = activeGame?.name;
    if (!gameName) return feedEvents;
    return feedEvents.filter((e) => e.game_name === gameName);
  }, [feedEvents, isAll, activeGame?.name]);

  return (
    <div className="space-y-6">
      <LeagueSeasonBanner
        league={league}
        games={games}
        members={allMembers}
        memberTotals={memberTotals}
        gameTotals={gameTotals}
        activeGameId={isAll ? undefined : activeGameId}
      />

      <section className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
          <LeaguePicker embedded />
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
          <GamePicker
            leagueId={leagueId}
            games={games}
            activeId={activeGameId}
            onChange={setActiveGameId}
            onGamesChange={setGames}
            embedded
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
          <ParticipantPicker
            leagueId={leagueId}
            sessionId={sessionId}
            allMembers={allMembers}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            gameId={isAll ? "" : activeGameId}
            gameName={activeGame?.name ?? ""}
            winCounts={winCounts}
            eloEnabled={eloEnabled}
            eloK={eloK}
            winsDisabled={isAll || winsBlocked}
            embedded
            memberColors={memberColors}
            onWinRecorded={(winnerId, gameIdRecorded) => {
              onTotalsChange?.(
                {
                  ...memberTotals,
                  [winnerId]: (memberTotals[winnerId] ?? 0) + 1,
                },
                {
                  ...gameTotals,
                  [gameIdRecorded]:
                    (gameTotals[gameIdRecorded] ?? 0) + 1,
                }
              );
            }}
            onLeagueMemberAdded={(member) => {
              setAllMembers((prev) => [...prev, member]);
              router.refresh();
            }}
          />
        </div>
      </section>

      {isAll && selectedIds.length > 0 && games.length > 0 && (
        <p className="text-center text-sm text-zinc-500">
          Для записи победы выберите конкретную игру
        </p>
      )}

      {selectedIds.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">График</h2>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
            <ArenaWinsChart
              events={sessionEvents}
              memberNames={memberNames}
              memberIds={selectedIds}
              gameId={activeGameId}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Лента</h2>
        <EventFeed
          leagueId={leagueId}
          initialEvents={filteredFeedEvents}
          currentUserId={currentUserId}
          memberNames={memberNames}
          gameNames={gameNames}
          filterGameId={isAll ? undefined : activeGameId}
        />
      </section>
    </div>
  );
}
