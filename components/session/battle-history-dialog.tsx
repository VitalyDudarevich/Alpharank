"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { BattleHistorySection } from "./battle-history-section";
import type { ArenaHistoryItem } from "@/lib/actions/arena";

type BattleHistoryDialogProps = {
  open: boolean;
  history: ArenaHistoryItem[];
  currentUserId: string;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
};

export function BattleHistoryDialog({
  open,
  history,
  currentUserId,
  onClose,
  onSelect,
}: BattleHistoryDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center p-4 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-history-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 id="battle-history-title" className="text-lg font-bold">
            История сражений
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <BattleHistorySection
            history={history}
            currentUserId={currentUserId}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
