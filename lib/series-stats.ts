import { playerIdFromName } from "@/lib/stats";
import type { SessionScoreEvent } from "@/lib/session-stats";

type RawScoreEvent = {
  id: string;
  session_id: string;
  winner_participant_id: string;
  participant_ids: string[];
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
};

/** События нескольких сражений с id игроков по имени (для графика серии). */
export function normalizeSeriesScoreEvents(
  events: RawScoreEvent[],
  participantNameById: Record<string, string>
): SessionScoreEvent[] {
  return events
    .map((e) => {
      const winnerName =
        participantNameById[e.winner_participant_id] ?? "";
      return {
        id: e.id,
        winner_member_id: null,
        winner_participant_id: playerIdFromName(winnerName),
        participant_ids: e.participant_ids.map((pid) =>
          playerIdFromName(participantNameById[pid] ?? "")
        ),
        game_id: null,
        created_at: e.created_at,
        created_by: e.created_by ?? "",
        deleted_at: e.deleted_at,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}

export function seriesMemberNames(
  participantNames: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const name of participantNames) {
    const id = playerIdFromName(name);
    map[id] = name;
  }
  return map;
}

export function seriesMemberIds(participantNames: string[]): string[] {
  return participantNames.map((n) => playerIdFromName(n));
}
