"use client";

import Link from "next/link";
import { Calendar, Flag, Target } from "lucide-react";
import { LeagueStandings } from "@/components/league/league-standings";
import {
  buildStandings,
  formatSeasonEndDate,
  isGameLocked,
  isLeagueConcluded,
  type GameWinTotals,
  type MemberWinTotals,
  type StandingRow,
} from "@/lib/league-season";
import type { Game, League, LeagueMember } from "@/lib/types";

interface LeagueSeasonBannerProps {
  league: League;
  games: Game[];
  members: LeagueMember[];
  memberTotals: MemberWinTotals;
  gameTotals: GameWinTotals;
  activeGameId?: string;
}

export function LeagueSeasonBanner({
  league,
  games,
  members,
  memberTotals,
  gameTotals,
  activeGameId,
}: LeagueSeasonBannerProps) {
  const concluded = isLeagueConcluded(league, memberTotals);
  const standings: StandingRow[] = concluded
    ? buildStandings(members, memberTotals)
    : [];

  const activeGame = games.find((g) => g.id === activeGameId);
  const gameLocked =
    activeGame &&
    activeGameId &&
    isGameLocked(activeGame, gameTotals[activeGameId] ?? 0, concluded);

  if (!concluded && !gameLocked && !league.ends_at && !league.target_wins) {
    const anyGameLimit = games.some((g) => g.target_wins);
    if (!anyGameLimit) return null;
  }

  return (
    <div className="space-y-3">
      {concluded && (
        <>
          <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-center">
            <p className="font-semibold text-amber-200">Лига завершена</p>
            <p className="mt-1 text-sm text-zinc-400">
              Новые результаты не принимаются. Места по сумме побед.
            </p>
            <Link
              href={`/league/${league.id}/today`}
              className="mt-2 inline-block text-sm text-violet-400 hover:text-violet-300"
            >
              Редактировать и продолжить →
            </Link>
          </div>
          <LeagueStandings standings={standings} compact />
        </>
      )}

      {!concluded && (
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {league.ends_at && (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1">
              <Calendar className="h-3 w-3" />
              Лига до {formatSeasonEndDate(league.ends_at)}
            </span>
          )}
          {league.target_wins != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1">
              <Target className="h-3 w-3" />
              До {league.target_wins} побед лидеру
            </span>
          )}
        </div>
      )}

      {!concluded && gameLocked && activeGame && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-400">
          <Flag className="mb-1 inline h-4 w-4 text-zinc-500" /> «{activeGame.name}» закрыта
          {activeGame.target_wins != null && (
            <span>
              {" "}
              (лимит {activeGame.target_wins} побед
              {gameTotals[activeGame.id] != null
                ? `, сейчас ${gameTotals[activeGame.id]}`
                : ""}
              )
            </span>
          )}
        </div>
      )}
    </div>
  );
}
