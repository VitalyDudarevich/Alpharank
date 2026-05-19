export const LAST_LEAGUE_STORAGE_KEY = "alpharank_last_league_id";

export function readLastLeagueId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_LEAGUE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeLastLeagueId(leagueId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_LEAGUE_STORAGE_KEY, leagueId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLeagueIdFromPath(pathname: string): string | null {
  return pathname.match(/^\/league\/([^/]+)/)?.[1] ?? null;
}
