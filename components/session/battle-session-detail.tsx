"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { fetchBattleDetail } from "@/lib/actions/arena";
import { winCountsFromEvents } from "@/lib/arena-games";
import { ArenaWinsChart } from "./arena-wins-chart";
import { SessionEventLog, type SessionLogEvent } from "./session-event-log";
import type { Game, LeagueMember } from "@/lib/types";
import type { SessionScoreEvent } from "@/lib/session-stats";

type BattleSessionDetailProps = {
  leagueId: string;
  sessionId: string;
  currentUserId: string;
  onBack: () => void;
};

export function BattleSessionDetail({
  leagueId,
  sessionId,
  currentUserId,
  onBack,
}: BattleSessionDetailProps) {
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [events, setEvents] = useState<SessionScoreEvent[]>([]);
  const [logEvents, setLogEvents] = useState<SessionLogEvent[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [endedAt, setEndedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchBattleDetail(leagueId, sessionId).then((result) => {
      if (cancelled) return;
      if ("error" in result && result.error) {
        setLoading(false);
        return;
      }
      const { session, game: g, members: m, events: ev, actorNames: actors } =
        result;
      setGame(g);
      setMembers(m);
      setEndedAt(session.ended_at ?? null);
      setActorNames(actors);
      const memberNames = Object.fromEntries(
        m.map((x) => [x.id, x.display_name])
      );
      const scoreEvents: SessionScoreEvent[] = ev.map((e) => ({
        id: e.id,
        winner_member_id: e.winner_member_id,
        participant_ids: e.participant_ids,
        game_id: e.game_id,
        created_at: e.created_at,
        created_by: e.created_by,
        deleted_at: e.deleted_at,
      }));
      setEvents(scoreEvents);
      setLogEvents(
        ev
          .filter((e) => !e.deleted_at)
          .map((e) => {
            const winner = e.winner as
              | { display_name: string }
              | { display_name: string }[]
              | null;
            const wName =
              (Array.isArray(winner) ? winner[0] : winner)?.display_name ??
              memberNames[e.winner_member_id] ??
              "?";
            return {
              id: e.id,
              winner_member_id: e.winner_member_id,
              winner_name: wName,
              actor_name: actors[e.created_by] ?? "Участник",
              created_by: e.created_by,
              created_at: e.created_at,
              deleted_at: e.deleted_at,
            };
          })
          .reverse()
      );
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [leagueId, sessionId]);

  const memberIds = members.map((m) => m.id);
  const memberNames = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.display_name])),
    [members]
  );
  const winCounts = useMemo(
    () => (game ? winCountsFromEvents(events, game.id) : {}),
    [events, game]
  );

  if (loading) {
    return <p className="py-8 text-center text-sm text-zinc-500">Загрузка…</p>;
  }

  if (!game) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Сражение не найдено
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
      >
        <ArrowLeft className="h-4 w-4" />
        К истории
      </button>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 px-4 py-3">
        <p className="font-semibold text-zinc-100">{game.name}</p>
        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          <Gamepad2 className="h-3.5 w-3.5" />
          Завершено
          {endedAt &&
            ` · ${format(new Date(endedAt), "d MMMM yyyy, HH:mm", { locale: ru })}`}
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/80">
        <div className="border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-medium text-zinc-400">Итоговые очки</h2>
        </div>
        <ul className="divide-y divide-zinc-800">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium text-zinc-100">
                {member.display_name}
              </span>
              <span className="text-2xl font-bold tabular-nums text-violet-300">
                {winCounts[member.id] ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-400">График</h2>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
          <ArenaWinsChart
            events={events}
            memberNames={memberNames}
            memberIds={memberIds}
            gameId={game.id}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">
          Журнал действий
        </h2>
        <SessionEventLog
          leagueId={leagueId}
          sessionId={sessionId}
          gameId={game.id}
          initialEvents={logEvents}
          memberNames={memberNames}
          actorNames={actorNames}
          currentUserId={currentUserId}
          readOnly
        />
      </section>
    </div>
  );
}
