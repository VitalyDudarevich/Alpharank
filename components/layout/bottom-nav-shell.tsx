"use client";

import { LeagueNav } from "@/components/layout/league-nav";

type BottomNavShellProps = {
  leagueId: string | null;
};

export function BottomNavShell({ leagueId }: BottomNavShellProps) {
  if (!leagueId) {
    return null;
  }

  return <LeagueNav leagueId={leagueId} />;
}
