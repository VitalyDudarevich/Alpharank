import type { SessionLogEvent } from "@/components/session/session-event-log";
import type { SessionScoreEvent } from "@/lib/session-stats";
import { eventWinnerId } from "@/lib/session-stats";

/** Номер раунда на графике (ось X «Игры») для каждого события. */
export function buildGameNumberMap(events: SessionScoreEvent[]): Map<string, number> {
  const active = events
    .filter((e) => !e.deleted_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const map = new Map<string, number>();
  active.forEach((e, index) => {
    map.set(e.id, index + 1);
  });
  return map;
}

export function buildSessionLogEvents(
  sessionEvents: SessionScoreEvent[],
  memberNames: Record<string, string>,
  actorNames: Record<string, string>,
  currentUserId: string
): SessionLogEvent[] {
  const gameNumbers = buildGameNumberMap(sessionEvents);

  return sessionEvents
    .filter((e) => !e.deleted_at)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((e) => {
      const winnerId = eventWinnerId(e);
      const createdBy = e.created_by ?? "";
      return {
        id: e.id,
        winner_member_id: winnerId,
        winner_name: memberNames[winnerId] ?? "?",
        game_number: gameNumbers.get(e.id) ?? 0,
        actor_name:
          createdBy === currentUserId
            ? "Вы"
            : actorNames[createdBy] ?? "Участник",
        created_by: createdBy,
        created_at: e.created_at,
        deleted_at: e.deleted_at,
      };
    });
}
