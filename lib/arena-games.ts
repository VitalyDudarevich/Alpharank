import type { SessionScoreEvent } from "@/lib/session-stats";

export const ALL_GAMES_ID = "all";
export const ALL_GAMES_LABEL = "Все игры";

export function isAllGames(gameId: string) {
  return !gameId || gameId === ALL_GAMES_ID;
}

export function filterSessionEventsByGame(
  events: SessionScoreEvent[],
  gameId: string
): SessionScoreEvent[] {
  const active = events.filter((e) => !e.deleted_at);
  if (isAllGames(gameId)) return active;
  return active.filter((e) => e.game_id === gameId);
}

export function winCountsFromEvents(
  events: SessionScoreEvent[],
  gameId: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of filterSessionEventsByGame(events, gameId)) {
    counts[event.winner_member_id] =
      (counts[event.winner_member_id] ?? 0) + 1;
  }
  return counts;
}
