"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteLeagueDialogProps = {
  open: boolean;
  leagueName: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteLeagueDialog({
  open,
  leagueName,
  pending = false,
  onClose,
  onConfirm,
}: DeleteLeagueDialogProps) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-league-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Закрыть"
        disabled={pending}
        onClick={() => !pending && onClose()}
      />

      <div
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800",
          "bg-zinc-900 shadow-2xl shadow-black/50"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-6 py-4 sm:px-10">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <AlertTriangle className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2
                id="delete-league-title"
                className="text-lg font-semibold text-zinc-50"
              >
                Удалить лигу?
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Это действие нельзя отменить
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-40"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-4 sm:px-10">
          <p className="text-sm leading-relaxed text-zinc-300">
            Лига{" "}
            <span className="font-semibold text-zinc-100">«{leagueName}»</span>{" "}
            будет удалена навсегда вместе с играми, результатами и списком
            участников.
          </p>
          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li>• все записанные победы и статистика</li>
            <li>• пригласительная ссылка перестанет работать</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 bg-zinc-950/50 p-6 sm:p-8">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            disabled={pending}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 w-full"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Удаление…" : "Удалить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
