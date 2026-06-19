"use client";

import { useEffect, useState, useTransition } from "react";
import { Gamepad2, Sparkles, Users, X } from "lucide-react";
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
  const [smartMode, setSmartMode] = useState(false);
  const [slotsInput, setSlotsInput] = useState<string>("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setGameName("");
    setParticipants([]);
    setSmartMode(false);
    setSlotsInput("");
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

  // Число мест в умном режиме: по умолчанию = числу участников, можно больше.
  const slots = smartMode
    ? slotsInput.trim() === ""
      ? participants.length
      : Math.floor(Number(slotsInput))
    : null;
  const slotsValid =
    !smartMode ||
    (Number.isFinite(slots) && (slots as number) >= participants.length);

  const canStart =
    gameName.trim().length > 0 && participants.length >= 2 && slotsValid;

  const handleStart = () => {
    if (gameName.trim().length === 0 || participants.length < 2) {
      toast.error("Укажите игру и минимум 2 участников");
      return;
    }
    if (!slotsValid) {
      toast.error("Число мест должно быть не меньше числа участников");
      return;
    }
    startTransition(async () => {
      const result = await startBattle({
        gameName: gameName.trim(),
        participantNames: participants,
        scoringMode: smartMode ? "smart" : "classic",
        participantSlots: smartMode ? (slots as number) : undefined,
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
      className="fixed inset-0 z-[10000] flex items-end justify-center max-md:p-0 sm:items-center sm:p-8"
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
      <div className="relative flex h-[min(92dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-900 shadow-2xl max-md:max-h-none sm:h-auto sm:max-h-[min(90vh,720px)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3 sm:px-10 sm:py-4">
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-10 sm:py-4">
          <section className="shrink-0 space-y-2 pb-4">
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

            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-800/30 p-3">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Умный подсчёт очков
                </span>
                <input
                  type="checkbox"
                  checked={smartMode}
                  onChange={(e) => setSmartMode(e.target.checked)}
                  disabled={pending}
                  className="h-5 w-5 accent-violet-600"
                />
              </label>
              <p className="text-xs text-zinc-600">
                Очки за место: 1-е место даёт N очков, последнее — 1.
              </p>
              {smartMode && (
                <div className="pt-1">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Количество участников (мест)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={Math.max(2, participants.length)}
                    value={slotsInput}
                    onChange={(e) => setSlotsInput(e.target.value)}
                    placeholder={String(Math.max(2, participants.length))}
                    disabled={pending}
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-600">
                    По умолчанию = числу добавленных игроков ({participants.length}).
                    Можно больше.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col space-y-2">
            <p className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-400">
              <Users className="h-4 w-4 text-violet-400" />
              Участники
              <span className="text-zinc-600">({participants.length})</span>
            </p>
            <p className="shrink-0 text-xs text-zinc-600">
              Выберите из списка или введите новое имя. Минимум 2 человека.
            </p>
            <div className="flex min-h-0 flex-1 flex-col">
              <ParticipantPicker
                variant="sheet"
                knownNames={knownFriends}
                onKnownNamesChange={setKnownFriends}
                selected={participants}
                onAdd={addParticipant}
                onRemove={removeParticipant}
                disabled={pending}
                placeholder="Найти или ввести имя друга…"
              />
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-zinc-800 p-4 sm:p-8">
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
