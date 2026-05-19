import type { Game, League } from "@/lib/types";

export type MemberWinTotals = Record<string, number>;

export type GameWinTotals = Record<string, number>;

export interface StandingRow {
  memberId: string;
  displayName: string;
  wins: number;
  place: number;
}

/** Today in local calendar (YYYY-MM-DD). */
export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isDatePastEnd(endDate: string | null | undefined, today = todayDateString()): boolean {
  if (!endDate) return false;
  return today > endDate;
}

export function maxMemberWins(totals: MemberWinTotals): number {
  return Math.max(0, ...Object.values(totals));
}

export function isLeagueConcluded(
  league: Pick<League, "concluded_at" | "ends_at" | "target_wins">,
  memberTotals: MemberWinTotals,
  today = todayDateString()
): boolean {
  if (league.concluded_at) return true;
  if (isDatePastEnd(league.ends_at, today)) return true;
  if (
    league.target_wins != null &&
    maxMemberWins(memberTotals) >= league.target_wins
  ) {
    return true;
  }
  return false;
}

export function isGameLocked(
  game: Pick<Game, "target_wins">,
  gameWinTotal: number,
  leagueConcluded: boolean
): boolean {
  if (leagueConcluded) return true;
  if (game.target_wins != null && gameWinTotal >= game.target_wins) return true;
  return false;
}

export function getLeagueConcludeReason(
  league: Pick<League, "ends_at" | "target_wins">,
  memberTotals: MemberWinTotals,
  today = todayDateString()
): "date" | "target_wins" | null {
  if (isDatePastEnd(league.ends_at, today)) return "date";
  if (
    league.target_wins != null &&
    maxMemberWins(memberTotals) >= league.target_wins
  ) {
    return "target_wins";
  }
  return null;
}

export function buildStandings(
  members: { id: string; display_name: string }[],
  memberTotals: MemberWinTotals
): StandingRow[] {
  const sorted = [...members].sort(
    (a, b) => (memberTotals[b.id] ?? 0) - (memberTotals[b.id] ?? 0)
  );

  let place = 0;
  let prevWins = -1;

  return sorted.map((m, index) => {
    const wins = memberTotals[m.id] ?? 0;
    if (wins !== prevWins) place = index + 1;
    prevWins = wins;
    return {
      memberId: m.id,
      displayName: m.display_name,
      wins,
      place,
    };
  });
}

export function formatSeasonEndDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}
