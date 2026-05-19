import type { ArenaHistoryItem } from "@/lib/actions/arena";

export type ArenaHistorySeries = {
  key: string;
  game_name: string;
  participant_names: string[];
  battles: ArenaHistoryItem[];
  battle_count: number;
  total_rounds: number;
  last_ended_at: string | null;
};

function normalizeGameName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

/** Ключ серии: одна игра + один и тот же набор игроков (порядок не важен). */
export function buildArenaSeriesKey(
  gameName: string,
  participantNames: string[]
): string {
  const game = normalizeGameName(gameName);
  const players = [...participantNames]
    .map(normalizePlayerName)
    .filter(Boolean)
    .sort();
  return `${game}\0${players.join("\0")}`;
}

export function groupHistoryBySeries(
  history: ArenaHistoryItem[]
): ArenaHistorySeries[] {
  const map = new Map<string, ArenaHistorySeries>();

  for (const battle of history) {
    const key = buildArenaSeriesKey(battle.game_name, battle.participant_names);
    const existing = map.get(key);
    if (existing) {
      existing.battles.push(battle);
      existing.battle_count += 1;
      existing.total_rounds += battle.event_count;
      const ended = battle.ended_at ?? battle.started_at;
      if (
        ended &&
        (!existing.last_ended_at ||
          new Date(ended).getTime() > new Date(existing.last_ended_at).getTime())
      ) {
        existing.last_ended_at = ended;
      }
    } else {
      map.set(key, {
        key,
        game_name: battle.game_name,
        participant_names: [...battle.participant_names],
        battles: [battle],
        battle_count: 1,
        total_rounds: battle.event_count,
        last_ended_at: battle.ended_at ?? battle.started_at,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const ta = a.last_ended_at ? new Date(a.last_ended_at).getTime() : 0;
    const tb = b.last_ended_at ? new Date(b.last_ended_at).getTime() : 0;
    return tb - ta;
  });
}

export function findSeriesByKey(
  history: ArenaHistoryItem[],
  seriesKey: string
): ArenaHistorySeries | undefined {
  return groupHistoryBySeries(history).find((s) => s.key === seriesKey);
}
