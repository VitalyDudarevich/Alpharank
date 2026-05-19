"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, Gamepad2, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  addGameByName,
  fetchLeagueGamesWithCatalog,
} from "@/lib/actions/games";
import { ALL_GAMES_ID, ALL_GAMES_LABEL } from "@/lib/arena-games";
import type { CatalogGameItem } from "@/lib/user-games-catalog";
import type { Game } from "@/lib/types";

interface GamePickerProps {
  leagueId: string;
  games: Game[];
  activeId: string;
  onChange: (id: string) => void;
  onGamesChange: (games: Game[]) => void;
  embedded?: boolean;
}

export function GamePicker({
  leagueId,
  games,
  activeId,
  onChange,
  onGamesChange,
  embedded = false,
}: GamePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogGameItem[]>([]);
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const activeGame = games.find((g) => g.id === activeId);
  const isAll = activeId === ALL_GAMES_ID;

  const refreshCatalog = useCallback(() => {
    void fetchLeagueGamesWithCatalog(leagueId).then((result) => {
      if (result.error) return;
      onGamesChange(result.games);
      setCatalog(result.catalog);
    });
  }, [leagueId, onGamesChange]);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

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

  const showAllGames =
    !q || ALL_GAMES_LABEL.toLowerCase().includes(q) || "все".includes(q);

  const filtered = useMemo(() => {
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q));
  }, [games, q]);

  const filteredCatalog = useMemo(() => {
    if (!q) return catalog;
    return catalog.filter((c) => c.name.toLowerCase().includes(q));
  }, [catalog, q]);

  const exactMatch = useMemo(() => {
    if (!q) return null;
    return (
      games.find((g) => g.name.toLowerCase() === q) ??
      catalog.find((c) => c.name.toLowerCase() === q) ??
      null
    );
  }, [games, catalog, q]);

  const canAdd = q.length > 0 && !exactMatch;

  const selectGame = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const handleAdd = () => {
    if (!canAdd || pending) return;
    startTransition(async () => {
      const result = await addGameByName(leagueId, query.trim());
      if ("error" in result && result.error) return;
      if ("game" in result && result.game) {
        const next = [...games, result.game];
        onGamesChange(next);
        setCatalog((prev) =>
          prev.filter((c) => c.name.toLowerCase() !== query.trim().toLowerCase())
        );
        selectGame(result.game.id);
      }
    });
  };

  const handlePickCatalog = (item: CatalogGameItem) => {
    if (pending) return;
    startTransition(async () => {
      const result = await addGameByName(leagueId, item.name);
      if ("error" in result && result.error) return;
      if ("game" in result && result.game) {
        onGamesChange([...games, result.game]);
        setCatalog((prev) =>
          prev.filter((c) => c.name.toLowerCase() !== item.name.toLowerCase())
        );
        selectGame(result.game.id);
      }
    });
  };

  const label = isAll ? ALL_GAMES_LABEL : (activeGame?.name ?? "Игра");
  const hasListItems =
    showAllGames || filtered.length > 0 || filteredCatalog.length > 0;

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
          <Gamepad2 className="h-5 w-5 shrink-0 text-violet-400" />
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
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск или новая игра…"
                  className="h-10 pl-9"
                  autoFocus
                />
              </div>
              {canAdd && (
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={pending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/50 bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 disabled:opacity-50"
                  aria-label="Добавить игру"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {showAllGames && (
              <li>
                <button
                  type="button"
                  onClick={() => selectGame(ALL_GAMES_ID)}
                  className={cn(
                    "flex w-full px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/60",
                    isAll && "bg-violet-600/15 text-violet-200"
                  )}
                >
                  <span className="font-medium">{ALL_GAMES_LABEL}</span>
                </button>
              </li>
            )}

            {filtered.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => selectGame(game.id)}
                  className={cn(
                    "flex w-full px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/60",
                    game.id === activeId && "bg-violet-600/15 text-violet-200"
                  )}
                >
                  <span className="font-medium">{game.name}</span>
                </button>
              </li>
            ))}

            {filteredCatalog.length > 0 && (
              <>
                <li className="px-4 pt-2 pb-1 text-xs text-zinc-500">
                  Из других лиг
                </li>
                {filteredCatalog.map((item) => (
                  <li key={item.name.toLowerCase()}>
                    <button
                      type="button"
                      onClick={() => handlePickCatalog(item)}
                      disabled={pending}
                      className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/60 disabled:opacity-50"
                    >
                      <span className="font-medium text-zinc-200">
                        {item.name}
                      </span>
                      {item.target_wins != null && (
                        <span className="text-xs text-zinc-500">
                          лимит {item.target_wins} побед
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </>
            )}

            {!hasListItems && !canAdd ? (
              <li className="px-4 py-6 text-center text-sm text-zinc-500">
                {games.length === 0 && catalog.length === 0
                  ? "Добавьте игру через поиск и +"
                  : "Ничего не найдено"}
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </div>
  );
}
