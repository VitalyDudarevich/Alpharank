"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BattleDeleteConfirmDialogProps = {
  open: boolean;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function BattleDeleteConfirmDialog({
  open,
  pending = false,
  onCancel,
  onConfirm,
}: BattleDeleteConfirmDialogProps) {
  useEffect(() => {
    if (!open || pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center p-4 sm:p-8"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="battle-delete-title"
      aria-describedby="battle-delete-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Закрыть"
        disabled={pending}
        onClick={() => !pending && onCancel()}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/90",
          "bg-zinc-900 shadow-2xl shadow-black/50",
        )}
      >
        <div className="border-b border-zinc-800/80 bg-gradient-to-br from-red-950/40 to-zinc-900 px-5 py-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/20 ring-1 ring-red-500/30">
            <Trash2 className="h-5 w-5 text-red-400" aria-hidden />
          </div>
          <h2
            id="battle-delete-title"
            className="text-lg font-semibold tracking-tight text-zinc-50"
          >
            Удалить сражение?
          </h2>
          <p id="battle-delete-desc" className="mt-2 text-sm leading-relaxed text-zinc-400">
            Все очки, участники и история изменений будут удалены без возможности
            восстановления.
          </p>
        </div>

        <div className="flex items-start gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/90" aria-hidden />
          <p className="text-xs leading-relaxed text-zinc-500">
            Действие нельзя отменить. Ссылка на это сражение перестанет работать.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 border-zinc-700 text-zinc-200 sm:min-w-[7.5rem]"
            disabled={pending}
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="h-11 gap-2 bg-red-600 text-white hover:bg-red-500 sm:min-w-[9rem]"
            disabled={pending}
            onClick={onConfirm}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {pending ? "Удаление…" : "Удалить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
