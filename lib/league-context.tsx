"use client";

import { createContext, useContext } from "react";
import type { Game, League, LeagueMember } from "@/lib/types";

export interface LeagueContextValue {
  leagueId: string;
  league: League;
  members: LeagueMember[];
  games: Game[];
  currentMember: LeagueMember;
  userId: string;
}

const LeagueContext = createContext<LeagueContextValue | null>(null);

export function LeagueProvider({
  value,
  children,
}: {
  value: LeagueContextValue;
  children: React.ReactNode;
}) {
  return (
    <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueProvider");
  return ctx;
}
