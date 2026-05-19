"use client";

import { useEffect, useState, useTransition } from "react";
import { Gamepad2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startStandaloneBattle } from "@/lib/actions/standalone-arena";

type StandaloneBattleSetupDialogProps = {
  open: boolean;
  onClose: () => void;
  onStarted: () => void;
};

export function StandaloneBattleSetupDialog({
  open,
  onClose,
  onStarted,
}: StandaloneBattleSetupDialogProps) {
  const [gameName, setGameName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setGameName("");
    setNameInput("");
    setParticipants([]);
  }, [open]);

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

  const addParticipant = () => {
    const name = nameInput.trim();
    if (!name) return;
    if (
      participants.some((p) => p.toLowerCase() === name.toLowerCase())
    ) {
      toast.error("Участник уже добавлен");
      return;
    }
    setParticipants((prev) => [...prev, name]);
    setNameInput("");
  };

  const removeParticipant = (name: string) => {
    setParticipants((prev) => prev.filter((p) => p !== name));
  };

  const canStart = gameName.trim().length > 0 && participants.length >= 2;

  const handleStart = () => {
    if (!canStart) {
      toast.error("Укажите игру и минимум 2 участников");
      return;
    }
    startTransition(async () => {
      const result = await startStandaloneBattle({
        gameName: gameName.trim(),
        participantNames: participants,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Сражение началось!");
      onStarted();
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="standalone-battle-setup-title"
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
          <h2 id="standalone-battle-setup-title" className="text-lg font-bold">
            Сражение без лиги
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
              <Gamepad2 className="h-4 w-4 text-violet-400" />
              Игра
            </p>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Например: Коднеймс"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
            />
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Users className="h-4 w-4 text-violet-400" />
              Участники
              <span className="text-zinc-600">({participants.length})</span>
            </p>
            <p className="text-xs text-zinc-600">
              Введите имена и нажмите «Добавить». Минимум 2 человека.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="Имя участника"
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-zinc-600"
                disabled={!nameInput.trim() || pending}
                onClick={addParticipant}
              >
                Добавить
              </Button>
            </div>
            {participants.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {participants.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => removeParticipant(name)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1 text-sm text-violet-100 hover:bg-violet-600/30"
                    >
                      {name}
                      <X className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-zinc-800 p-4">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            disabled={!canStart || pending}
            onClick={handleStart}
          >
            {pending ? "Запуск…" : "Начать сражение!"}
          </Button>
        </div>
      </div>
    </div>
  );
}
