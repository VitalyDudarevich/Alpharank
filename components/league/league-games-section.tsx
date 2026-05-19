"use client";

import { useEffect, useMemo, useState } from "react";
import { Gamepad2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchUserGamesCatalog } from "@/lib/actions/games";
import type { CatalogGameItem } from "@/lib/user-games-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LeagueGamesSectionGame = {
  id: string;
  name: string;
  targetWins?: string | number | null;
};

type LeagueGamesSectionProps = {
  games: LeagueGamesSectionGame[];
  disabled?: boolean;
  pending?: boolean;
  /** Удаление и редактирование лимита побед */
  editable?: boolean;
  /** Кнопка «Добавить игру» и форма выбора */
  allowAdd?: boolean;
  emptyText?: string;
  onAdd?: (params: {
    name: string;
    targetWins: number | null;
  }) => void | Promise<void>;
  onRemove?: (gameId: string) => void;
  onTargetWinsChange?: (gameId: string, value: string) => void;
  targetWinsValues?: Record<string, string>;
  excludeLeagueId?: string;
};

export function LeagueGamesSection({
  games,
  disabled = false,
  pending = false,
  editable = false,
  allowAdd = false,
  emptyText = "Игр пока нет",
  onAdd,
  onRemove,
  onTargetWinsChange,
  targetWinsValues,
  excludeLeagueId,
}: LeagueGamesSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogGameItem[]>([]);
  const [listOpen, setListOpen] = useState(false);

  const busy = disabled || pending;
  const existingNames = useMemo(
    () => new Set(games.map((g) => g.name.toLowerCase())),
    [games]
  );

  useEffect(() => {
    if (!pickerOpen || !allowAdd) return;
    void fetchUserGamesCatalog(excludeLeagueId).then((res) => {
      if (!res.error) setCatalog(res.catalog);
    });
  }, [pickerOpen, allowAdd, excludeLeagueId]);

  const catalogAvailable = useMemo(
    () => catalog.filter((c) => !existingNames.has(c.name.toLowerCase())),
    [catalog, existingNames]
  );

  const q = query.trim().toLowerCase();
  const filteredCatalog = useMemo(() => {
    if (!q) return catalogAvailable;
    return catalogAvailable.filter((c) => c.name.toLowerCase().includes(q));
  }, [catalogAvailable, q]);

  const closePicker = () => {
    setPickerOpen(false);
    setQuery("");
    setListOpen(false);
  };

  const commitAdd = async (name: string, targetWins: number | null = null) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existingNames.has(trimmed.toLowerCase())) {
      toast.error("Такая игра уже есть");
      return;
    }
    try {
      await onAdd?.({ name: trimmed, targetWins });
      closePicker();
    } catch {
      // форма остаётся открытой при ошибке
    }
  };

  const addFromCatalog = (item: CatalogGameItem) => {
    void commitAdd(item.name, item.target_wins);
  };

  const addNew = () => {
    void commitAdd(query, null);
  };

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-400">
        <Gamepad2 className="h-4 w-4" />
        Игры
      </h3>

      {games.length === 0 && !allowAdd ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {games.map((game) => {
            const targetValue =
              targetWinsValues?.[game.id] ??
              (game.targetWins != null && game.targetWins !== ""
                ? String(game.targetWins)
                : "");

            return (
              <li
                key={game.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-200">{game.name}</span>
                  {editable && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(game.id)}
                      disabled={busy}
                      className="text-zinc-500 hover:text-red-400 disabled:opacity-40"
                      aria-label={`Удалить ${game.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!editable && game.targetWins != null && game.targetWins !== "" && (
                  <p className="mt-1 text-xs text-zinc-500">
                    лимит {game.targetWins} побед
                  </p>
                )}

                {editable && onTargetWinsChange && (
                  <label className="mt-2 block border-t border-zinc-800/80 pt-2 text-xs text-zinc-500">
                    Лимит побед
                    <Input
                      type="number"
                      min={1}
                      placeholder="—"
                      value={targetValue}
                      onChange={(e) => onTargetWinsChange(game.id, e.target.value)}
                      className="mt-1 h-9"
                      disabled={busy}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {allowAdd && !pickerOpen && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 w-full border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800/80"
          disabled={busy}
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить игру
        </Button>
      )}

      {allowAdd && pickerOpen && (
        <div className="relative mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setListOpen(true);
                }}
                onFocus={() => setListOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setListOpen(false), 150);
                }}
                placeholder={
                  catalogAvailable.length > 0
                    ? "Поиск или новая игра…"
                    : "Новая игра…"
                }
                className="h-10 pl-9"
                disabled={busy}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNew();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={busy || !query.trim()}
              onClick={addNew}
              aria-label="Добавить новую игру"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {listOpen && filteredCatalog.length > 0 && (
            <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900">
              <li className="px-3 pt-2 pb-1 text-xs text-zinc-500">
                Из ваших других лиг
              </li>
              {filteredCatalog.map((item) => (
                <li key={item.name.toLowerCase()}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-800/80 disabled:opacity-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addFromCatalog(item)}
                    disabled={busy}
                  >
                    <span className="text-sm font-medium text-zinc-200">
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
            </ul>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 text-zinc-500 hover:text-zinc-300"
            disabled={busy}
            onClick={closePicker}
          >
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}
