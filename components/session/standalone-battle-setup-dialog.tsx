"use client";

import { useEffect, useState, useTransition } from "react";
import { Gamepad2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startBattle } from "@/lib/actions/arena";
import { fetchKnownFriendNames } from "@/lib/actions/friends";
import { fetchKnownGameNames } from "@/lib/actions/games";
import { GameSelect } from "@/components/session/game-select";
import { ParticipantPicker } from "@/components/session/participant-picker";

type StandaloneBattleSetupDialogProps = {
  open: boolean;
  onClose: () => void;
  onStarted: (sessionId: string) => void;
};

export function StandaloneBattleSetupDialog({
  open,
  onClose,
  onStarted,
}: StandaloneBattleSetupDialogProps) {
  const [gameName, setGameName] = useState("");
  const [knownGames, setKnownGames] = useState<string[]>([]);
  const [knownFriends, setKnownFriends] = useState<string[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setGameName("");
    setParticipants([]);
    void Promise.all([
      fetchKnownGameNames().then(setKnownGames),
      fetchKnownFriendNames().then(setKnownFriends),
    ]);
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

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Участник уже добавлен");
      return;
    }
    setParticipants((prev) => [...prev, trimmed]);
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
      const result = await startBattle({
        gameName: gameName.trim(),
        participantNames: participants,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Сражение началось!");
      if (result.sessionId) onStarted(result.sessionId);
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center sm:p-8"
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
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4 sm:px-10">
          <h2 id="standalone-battle-setup-title" className="text-lg font-bold">
            Новое сражение
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4 sm:px-10">
          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Gamepad2 className="h-4 w-4 text-violet-400" />
              Игра
            </p>
            <GameSelect
              games={knownGames}
              onGamesChange={setKnownGames}
              value={gameName}
              onChange={setGameName}
              disabled={pending}
              placeholder="Найти или ввести игру…"
            />
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Users className="h-4 w-4 text-violet-400" />
              Участники
              <span className="text-zinc-600">({participants.length})</span>
            </p>
            <p className="text-xs text-zinc-600">
              Выберите из списка или введите новое имя. Минимум 2 человека.
            </p>
            <ParticipantPicker
              knownNames={knownFriends}
              onKnownNamesChange={setKnownFriends}
              selected={participants}
              onAdd={addParticipant}
              disabled={pending}
              placeholder="Найти или ввести имя друга…"
            />
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

        <div className="shrink-0 border-t border-zinc-800 p-6 sm:p-8">
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
