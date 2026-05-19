export interface SessionScoreEvent {
  id: string;
  winner_member_id: string;
  participant_ids: string[];
  game_id: string;
  created_at: string;
  created_by: string;
  deleted_at: string | null;
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
    const winnerId = event.winner_member_id;
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
    if (stats[event.winner_member_id]) {
      stats[event.winner_member_id].wins += 1;
    }
  }

  return memberIds.map((memberId) => ({
    memberId,
    wins: stats[memberId]?.wins ?? 0,
    games: stats[memberId]?.games ?? 0,
  }));
}
