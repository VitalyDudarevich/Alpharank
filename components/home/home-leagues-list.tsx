"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { writeLastLeagueId } from "@/lib/last-league";

export type HomeLeagueItem = {
  id: string;
  name: string;
  year: number | null;
};

type HomeLeaguesListProps = {
  leagues: HomeLeagueItem[];
  highlightLeagueId?: string | null;
};

export function HomeLeaguesList({
  leagues,
  highlightLeagueId,
}: HomeLeaguesListProps) {
  const router = useRouter();
  const [activeHighlight, setActiveHighlight] = useState<string | null>(
    highlightLeagueId ?? null
  );

  useEffect(() => {
    if (!highlightLeagueId) return;
    setActiveHighlight(highlightLeagueId);
    const timer = window.setTimeout(() => {
      setActiveHighlight(null);
      router.replace("/", { scroll: false });
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [highlightLeagueId, router]);

  const sortedLeagues = useMemo(() => {
    if (!highlightLeagueId) return leagues;
    const index = leagues.findIndex((l) => l.id === highlightLeagueId);
    if (index <= 0) return leagues;
    const next = [...leagues];
    const [item] = next.splice(index, 1);
    return [item, ...next];
  }, [leagues, highlightLeagueId]);

  return (
    <ul className="space-y-3">
      {sortedLeagues.map((league) => {
        const highlighted = activeHighlight === league.id;
        return (
          <li key={league.id}>
            <Link
              href={`/league/${league.id}`}
              onClick={() => writeLastLeagueId(league.id)}
            >
              <Card
                className={cn(
                  "flex items-center justify-between transition-all duration-1000 ease-out",
                  highlighted
                    ? "border-violet-500/80 bg-violet-600/15 ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/25"
                    : "hover:border-violet-600/50"
                )}
              >
                <div>
                  <p className="font-semibold">{league.name}</p>
                  {league.year != null && (
                    <p className="text-sm text-zinc-500">{league.year}</p>
                  )}
                </div>
                <Trophy
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-1000",
                    highlighted ? "text-violet-300" : "text-violet-400"
                  )}
                />
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
