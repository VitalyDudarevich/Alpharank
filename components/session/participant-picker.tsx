"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { addUserFriendByName } from "@/lib/actions/friends";
import { cn } from "@/lib/utils";

type ParticipantPickerProps = {
  knownNames: string[];
  onKnownNamesChange?: (names: string[]) => void;
  selected: string[];
  onAdd: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ParticipantPicker({
  knownNames,
  onKnownNamesChange,
  selected,
  onAdd,
  disabled,
  placeholder = "Найти или ввести имя…",
}: ParticipantPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const trimmedQuery = query.trim();
  const queryLower = trimmedQuery.toLowerCase();

  const selectedLower = useMemo(
    () => new Set(selected.map((n) => n.toLowerCase())),
    [selected]
  );

  const filtered = useMemo(() => {
    const available = knownNames.filter(
      (n) => !selectedLower.has(n.toLowerCase())
    );
    if (!queryLower) return available;
    return available.filter((n) => n.toLowerCase().includes(queryLower));
  }, [knownNames, queryLower, selectedLower]);

  const exactMatch =
    knownNames.some((n) => n.toLowerCase() === queryLower) ||
    selectedLower.has(queryLower);
  const canAddNew =
    trimmedQuery.length > 0 && !selectedLower.has(queryLower) && !exactMatch;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

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

  const pickName = (name: string) => {
    onAdd(name);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const addNewName = () => {
    if (!canAddNew || pending || disabled) return;
    startTransition(async () => {
      const result = await addUserFriendByName(trimmedQuery);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const name = (result.friend?.name ?? trimmedQuery).trim();
      onKnownNamesChange?.(
        [...knownNames.filter((n) => n.toLowerCase() !== name.toLowerCase()), name].sort(
          (a, b) => a.localeCompare(b, "ru")
        )
      );
      onAdd(name);
      setQuery("");
      setOpen(false);
    });
  };

  const addFromInput = () => {
    if (!trimmedQuery || selectedLower.has(queryLower)) return;
    const known = knownNames.find((n) => n.toLowerCase() === queryLower);
    if (known) {
      pickName(known);
      return;
    }
    if (canAddNew) addNewName();
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
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length === 1 && !canAddNew) {
                pickName(filtered[0]);
              } else if (canAddNew) {
                addNewName();
              } else if (trimmedQuery && !selectedLower.has(queryLower)) {
                addFromInput();
              }
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery("");
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : setOpen(true))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-700/80 hover:text-zinc-300"
          aria-label={open ? "Свернуть список" : "Развернуть список"}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
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
              filtered.map((name) => (
                <li key={name} role="option">
                  <button
                    type="button"
                    disabled={pending}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickName(name)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    <span className="truncate">{name}</span>
                    <Plus className="h-4 w-4 shrink-0 text-violet-400" />
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-center text-sm text-zinc-500">
                {trimmedQuery
                  ? selectedLower.has(queryLower)
                    ? "Уже в списке"
                    : "Ничего не найдено"
                  : knownNames.length === selected.length
                    ? "Все друзья уже добавлены"
                    : "Нет сохранённых имён"}
              </li>
            )}
          </ul>

          {canAddNew && (
            <div className="border-t border-zinc-800 p-2">
              <button
                type="button"
                disabled={disabled || pending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={addNewName}
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
