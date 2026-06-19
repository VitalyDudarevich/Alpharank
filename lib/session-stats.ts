export interface SessionScoreEvent {
  id: string;
  winner_member_id: string | null;
  winner_participant_id?: string | null;
  participant_ids: string[];
  /** Места участников за раунд в умном режиме: { participant_id: место }. */
  placements?: Record<string, number> | null;
  game_id: string | null;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
}

export function eventWinnerId(event: SessionScoreEvent): string {
  return event.winner_member_id ?? event.winner_participant_id ?? "";
}

/** Очки за место в умном режиме: N мест, 1-е место даёт N очков, последнее — 1. */
export function pointsForPlace(slots: number, place: number): number {
  if (!Number.isFinite(slots) || !Number.isFinite(place)) return 0;
  return Math.max(0, slots - place + 1);
}

/**
 * Сумма очков по участникам внутри одного сражения (умный режим).
 * Для обычных раундов (без placements) очки не начисляются.
 */
export function computeSessionPoints(
  events: SessionScoreEvent[],
  slots: number
): Record<string, number> {
  const points: Record<string, number> = {};
  for (const event of events) {
    if (event.deleted_at || !event.placements) continue;
    for (const [pid, place] of Object.entries(event.placements)) {
      points[pid] = (points[pid] ?? 0) + pointsForPlace(slots, place);
    }
  }
  return points;
}

export interface PlayerSessionStat {
  memberId: string;
  wins: number;
  games: number;
}

export interface PlayerTimelinePoint {
  games: number;
  wins: number;
}

export function computePlayerTimelines(
  events: SessionScoreEvent[],
  memberIds: string[]
): Record<string, PlayerTimelinePoint[]> {
  const timelines: Record<string, PlayerTimelinePoint[]> = {};
  for (const id of memberIds) {
    timelines[id] = [{ games: 0, wins: 0 }];
  }

  const activeEvents = events
    .filter((e) => !e.deleted_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  for (const event of activeEvents) {
    const winnerId = eventWinnerId(event);
    for (const pid of event.participant_ids) {
      if (!timelines[pid]) timelines[pid] = [{ games: 0, wins: 0 }];
      const last = timelines[pid][timelines[pid].length - 1];
      timelines[pid].push({
        games: last.games + 1,
        wins: last.wins + (pid === winnerId ? 1 : 0),
      });
    }
  }

  return timelines;
}

export function computeSessionPlayerStats(
  events: SessionScoreEvent[],
  memberIds: string[]
): PlayerSessionStat[] {
  const stats: Record<string, { wins: number; games: number }> = {};
  for (const id of memberIds) {
    stats[id] = { wins: 0, games: 0 };
  }

  for (const event of events) {
    if (event.deleted_at) continue;
    for (const pid of event.participant_ids) {
      if (!stats[pid]) stats[pid] = { wins: 0, games: 0 };
      stats[pid].games += 1;
    }
    const winnerId = eventWinnerId(event);
    if (stats[winnerId]) {
      stats[winnerId].wins += 1;
    }
  }

  return memberIds.map((memberId) => ({
    memberId,
    wins: stats[memberId]?.wins ?? 0,
    games: stats[memberId]?.games ?? 0,
  }));
}
