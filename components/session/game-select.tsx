"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { addUserGameByName } from "@/lib/actions/games";
import { cn } from "@/lib/utils";

type GameSelectProps = {
  games: string[];
  onGamesChange?: (games: string[]) => void;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function GameSelect({
  games,
  onGamesChange,
  value,
  onChange,
  disabled,
  placeholder = "Найти или ввести игру…",
}: GameSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [pending, startTransition] = useTransition();

  const trimmedQuery = query.trim();
  const queryLower = trimmedQuery.toLowerCase();

  const filtered = useMemo(() => {
    if (!queryLower) return games;
    return games.filter((g) => g.toLowerCase().includes(queryLower));
  }, [games, queryLower]);

  const exactMatch = games.some((g) => g.toLowerCase() === queryLower);
  const canAddNew = trimmedQuery.length > 0 && !exactMatch;

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const selectFromList = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  const addNewGame = () => {
    if (!canAddNew || pending || disabled) return;
    startTransition(async () => {
      const result = await addUserGameByName(trimmedQuery);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const name = (result.game?.name ?? trimmedQuery).trim();
      onChange(name);
      setQuery(name);
      onGamesChange?.(
        [...games.filter((g) => g.toLowerCase() !== name.toLowerCase()), name].sort(
          (a, b) => a.localeCompare(b, "ru")
        )
      );
      setOpen(false);
    });
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex h-12 items-center gap-1 rounded-xl border bg-zinc-800/50 pr-1 transition-colors",
          open
            ? "border-violet-500 ring-1 ring-violet-500/40"
            : "border-zinc-700 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/40",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled || pending}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAddNew) {
              e.preventDefault();
              addNewGame();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery(value);
            }
            if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-700/80 hover:text-zinc-300"
          aria-label={open ? "Свернуть список" : "Развернуть список"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
        >
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length > 0 ? (
              filtered.map((name) => {
                const selected =
                  value.trim().toLowerCase() === name.toLowerCase();
                return (
                  <li key={name} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      disabled={pending}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectFromList(name)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "bg-violet-600/20 text-violet-100"
                          : "text-zinc-200 hover:bg-zinc-800"
                      )}
                    >
                      <span className="truncate">{name}</span>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-violet-400" />
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-3 text-center text-sm text-zinc-500">
                {trimmedQuery ? "Ничего не найдено" : "Нет сохранённых игр"}
              </li>
            )}
          </ul>

          {canAddNew && (
            <div className="border-t border-zinc-800 p-2">
              <button
                type="button"
                disabled={disabled || pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={addNewGame}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                <Plus className="h-4 w-4 shrink-0" />
                {pending ? "Добавление…" : `Добавить «${trimmedQuery}»`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
