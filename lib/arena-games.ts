import type { SessionScoreEvent } from "@/lib/session-stats";
import { eventWinnerId } from "@/lib/session-stats";

export const ALL_GAMES_ID = "all";
export const ALL_GAMES_LABEL = "Все игры";

export function isAllGames(gameId: string) {
  return !gameId || gameId === ALL_GAMES_ID;
}

export function filterSessionEventsByGame(
  events: SessionScoreEvent[],
  gameId: string | null
): SessionScoreEvent[] {
  const active = events.filter((e) => !e.deleted_at);
  if (gameId === null) return active.filter((e) => e.game_id === null);
  if (isAllGames(gameId)) return active;
  return active.filter((e) => e.game_id === gameId);
}

export function winCountsFromEvents(
  events: SessionScoreEvent[],
  gameId: string | null
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of filterSessionEventsByGame(events, gameId)) {
    const winnerId = eventWinnerId(event);
    counts[winnerId] = (counts[winnerId] ?? 0) + 1;
  }
  return counts;
}
