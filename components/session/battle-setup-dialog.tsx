"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Gamepad2, Shield, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startBattle } from "@/lib/actions/arena";
import { LeaguePicker } from "./league-picker";
import type { Game, League, LeagueMember } from "@/lib/types";

type BattleSetupDialogProps = {
  open: boolean;
  league: League;
  games: Game[];
  members: LeagueMember[];
  suggestedMemberIds: string[];
  onClose: () => void;
  onStarted: (sessionId: string) => void;
};

export function BattleSetupDialog({
  open,
  league,
  games,
  members,
  suggestedMemberIds,
  onClose,
  onStarted,
}: BattleSetupDialogProps) {
  const [gameId, setGameId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const validSuggested = suggestedMemberIds.filter((id) =>
      members.some((m) => m.id === id)
    );
    setSelectedIds(validSuggested.length >= 2 ? validSuggested : []);
    setGameId(games[0]?.id ?? "");
  }, [open, suggestedMemberIds, members, games]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onClose]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canStart = gameId && selectedIds.length >= 2;

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        a.display_name.localeCompare(b.display_name, "ru")
      ),
    [members]
  );

  const handleStart = () => {
    if (!canStart) {
      toast.error("Выберите игру и минимум 2 участников из лиги");
      return;
    }
    startTransition(async () => {
      const result = await startBattle({
        leagueId: league.id,
        gameId,
        memberIds: selectedIds,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Сражение началось!");
      onStarted(result.sessionId!);
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-setup-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Закрыть"
        disabled={pending}
        onClick={() => !pending && onClose()}
      />

      <div className="relative flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 id="battle-setup-title" className="text-lg font-bold">
            Настройка сражения
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Shield className="h-4 w-4 text-violet-400" />
              Лига
            </p>
            <div className="overflow-hidden rounded-xl border border-zinc-700">
              <LeaguePicker embedded />
            </div>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Gamepad2 className="h-4 w-4 text-violet-400" />
              Игра
            </p>
            {games.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-700 px-4 py-6 text-center text-sm text-zinc-500">
                В лиге нет игр. Добавьте игры в настройках лиги.
              </p>
            ) : (
              <ul className="space-y-1 rounded-xl border border-zinc-700 p-1">
                {games.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setGameId(g.id)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        gameId === g.id
                          ? "bg-violet-600/25 text-violet-100"
                          : "text-zinc-200 hover:bg-zinc-800/60"
                      )}
                    >
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Users className="h-4 w-4 text-violet-400" />
              Участники
              <span className="text-zinc-600">({selectedIds.length})</span>
            </p>
            <p className="text-xs text-zinc-600">
              Только из списка лиги. Минимум 2 человека.
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-zinc-700 p-1">
              {sortedMembers.map((m) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        checked
                          ? "bg-violet-600/20 text-violet-100"
                          : "text-zinc-200 hover:bg-zinc-800/60"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
                          checked
                            ? "border-violet-500 bg-violet-600 text-white"
                            : "border-zinc-600"
                        )}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {m.display_name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-800 p-4">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            disabled={!canStart || pending}
            onClick={handleStart}
          >
            {pending ? "Запуск…" : "Начать сражение!"}
          </Button>
          <p className="text-center text-xs text-zinc-500">
            <Link
              href="/arena"
              className="text-violet-400 hover:text-violet-300"
              onClick={onClose}
            >
              Сражение без лиги →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
