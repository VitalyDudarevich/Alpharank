"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Plus, Search, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useLeague } from "@/lib/league-context";

type UserLeague = {
  id: string;
  name: string;
  year: number | null;
};

export const STANDALONE_ARENA_LEAGUE_ID = "__standalone__";

const standaloneLeagueOption: UserLeague = {
  id: STANDALONE_ARENA_LEAGUE_ID,
  name: "Без лиги",
  year: null,
};

interface LeaguePickerProps {
  embedded?: boolean;
  onStandaloneSelect?: () => void;
}

export function LeaguePicker({
  embedded = true,
  onStandaloneSelect,
}: LeaguePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { leagueId, league, userId } = useLeague();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leagues, setLeagues] = useState<UserLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("league_members")
      .select("leagues(id, name, year)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        const list =
          data
            ?.map((row) => {
              const l = row.leagues as UserLeague | UserLeague[] | null;
              return Array.isArray(l) ? l[0] : l;
            })
            .filter((l): l is UserLeague => !!l) ?? [];
        setLeagues(list);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();

  const isLeaguePage = /^\/league\/[^/]+/.test(pathname);

  const filtered = useMemo(() => {
    const matchesLeagues = !q
      ? leagues
      : leagues.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            (l.year != null && String(l.year).includes(q))
        );
    if (isLeaguePage) return matchesLeagues;
    const showStandalone =
      !q || standaloneLeagueOption.name.toLowerCase().includes(q);
    return showStandalone
      ? [standaloneLeagueOption, ...matchesLeagues]
      : matchesLeagues;
  }, [leagues, q, isLeaguePage]);

  const isStandaloneArena =
    pathname === "/arena" || pathname.startsWith("/arena/");

  const selectLeague = (id: string) => {
    setOpen(false);
    setQuery("");
    if (id === STANDALONE_ARENA_LEAGUE_ID) {
      onStandaloneSelect?.();
      router.push("/arena");
      return;
    }
    if (id !== leagueId) {
      router.push(`/league/${id}/today`);
    }
  };

  const label = isStandaloneArena ? "Без лиги" : league.name;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left transition-colors",
          embedded
            ? "px-4 py-3 hover:bg-zinc-800/40"
            : cn(
                "rounded-2xl border px-4 py-3",
                open
                  ? "border-violet-500/50 bg-violet-600/10"
                  : "border-zinc-700 bg-zinc-900/80 hover:border-zinc-600"
              )
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Shield className="h-5 w-5 shrink-0 text-violet-400" />
          <span className="truncate font-medium">{label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            embedded
              ? "border-t border-zinc-800 bg-zinc-900/50"
              : "mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900/95 shadow-xl"
          )}
        >
          <div className="border-b border-zinc-800 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск лиги…"
                className="h-10 pl-9"
                autoFocus
              />
            </div>
          </div>

          <ul className="max-h-48 overflow-y-auto">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-zinc-500">
                Загрузка…
              </li>
            ) : filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-zinc-500">
                {leagues.length === 0 ? (
                  <Link
                    href="/?create=1"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    Создать лигу
                  </Link>
                ) : (
                  "Ничего не найдено"
                )}
              </li>
            ) : (
              filtered.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => selectLeague(l.id)}
                    className={cn(
                      "flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/60",
                      (l.id === STANDALONE_ARENA_LEAGUE_ID
                        ? isStandaloneArena
                        : l.id === leagueId) &&
                        "bg-violet-600/15 text-violet-200"
                    )}
                  >
                    <span className="font-medium">{l.name}</span>
                    {l.year != null && (
                      <span className="text-xs text-zinc-500">{l.year}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {!loading && leagues.length > 0 && (
            <div className="border-t border-zinc-800 p-2">
              <Link
                href="/?create=1"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs text-violet-400 hover:bg-zinc-800/60 hover:text-violet-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Создать лигу
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
