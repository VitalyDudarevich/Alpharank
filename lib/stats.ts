import type { ScoreEvent, StatsFilter, MemberStats, StatsPlayer } from "./types";

function normalizeRoster(ids: string[]): string {
  return [...ids].sort().join(",");
}

export function filterScoreEvents(
  events: ScoreEvent[],
  filter: StatsFilter
): ScoreEvent[] {
  return events.filter((e) => {
    if (e.deleted_at) return false;
    if (filter.gameName && e.game_name?.toLowerCase() !== filter.gameName.toLowerCase())
      return false;
    if (
      filter.playerCount !== undefined &&
      e.participant_ids.length !== filter.playerCount
    )
      return false;
    if (filter.rosterIds && filter.rosterIds.length > 0) {
      if (normalizeRoster(e.participant_ids) !== normalizeRoster(filter.rosterIds))
        return false;
    }
    return true;
  });
}

export function computeMemberStats(
  events: ScoreEvent[],
  players: StatsPlayer[]
): MemberStats[] {
  const wins = new Map<string, number>();
  const played = new Map<string, number>();

  for (const e of events) {
    for (const pid of e.participant_ids) {
      played.set(pid, (played.get(pid) ?? 0) + 1);
    }
    wins.set(
      e.winner_participant_id,
      (wins.get(e.winner_participant_id) ?? 0) + 1
    );
  }

  const participantIds = new Set([...played.keys(), ...wins.keys()]);

  return players
    .filter((m) => participantIds.has(m.id) || wins.has(m.id))
    .map((m) => {
      const w = wins.get(m.id) ?? 0;
      const g = played.get(m.id) ?? 0;
      return {
        member_id: m.id,
        display_name: m.display_name,
        wins: w,
        games_played: g,
        win_rate: g > 0 ? Math.round((w / g) * 100) : 0,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.win_rate - a.win_rate);
}

export function buildCumulativeTimeline(
  events: ScoreEvent[],
  players: StatsPlayer[]
): { date: string; [key: string]: string | number }[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const totals = new Map<string, number>();
  players.forEach((m) => totals.set(m.id, 0));

  const byDate = new Map<string, Record<string, string | number>>();

  for (const e of sorted) {
    const date = e.created_at.split("T")[0];
    totals.set(
      e.winner_participant_id,
      (totals.get(e.winner_participant_id) ?? 0) + 1
    );
    const row: Record<string, string | number> = { date };
    players.forEach((m) => {
      row[m.display_name] = totals.get(m.id) ?? 0;
    });
    byDate.set(date, row);
  }

  return Array.from(byDate.values()) as {
    date: string;
    [key: string]: string | number;
  }[];
}

/** Стабильный id игрока по имени (для кросс-сессионной статистики) */
export function playerIdFromName(name: string): string {
  return name.trim().toLowerCase();
}
