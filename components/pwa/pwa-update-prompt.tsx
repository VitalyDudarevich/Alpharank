"use client";

import { useEffect } from "react";
import { Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PwaUpdatePromptProps = {
  open: boolean;
  appVersion: string | null;
  busy: boolean;
  onUpdate: () => void;
  onPostpone: () => void;
};

export function PwaUpdatePrompt({
  open,
  appVersion,
  busy,
  onUpdate,
  onPostpone,
}: PwaUpdatePromptProps) {
  useEffect(() => {
    if (!open || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPostpone();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onPostpone]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10100] flex items-end justify-center p-4 sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Закрыть"
        onClick={busy ? undefined : onPostpone}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/90",
          "bg-zinc-900 shadow-2xl shadow-black/50",
        )}
      >
        <div className="border-b border-zinc-800/80 bg-gradient-to-br from-violet-950/50 to-zinc-900 px-5 py-5">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/20 ring-1 ring-violet-500/30">
            <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
          </div>
          <h2
            id="pwa-update-title"
            className="text-lg font-semibold tracking-tight text-zinc-50"
          >
            Приложение обновилось
          </h2>
          <p id="pwa-update-desc" className="mt-2 text-sm leading-relaxed text-zinc-400">
            На сервере доступна новая версия AlphaRank. Обновите сейчас, чтобы
            получить последние исправления и возможности — страница перезагрузится
            автоматически.
          </p>
          {appVersion && (
            <p className="mt-2 font-mono text-xs text-zinc-600">
              Версия {appVersion}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 border-zinc-700 text-zinc-200 sm:min-w-[7.5rem]"
            disabled={busy}
            onClick={onPostpone}
          >
            Позже
          </Button>
          <Button
            type="button"
            className="h-11 gap-2 sm:min-w-[9rem]"
            disabled={busy}
            onClick={onUpdate}
          >
            <Download className={cn("h-4 w-4", busy && "animate-pulse")} />
            {busy ? "Обновление…" : "Обновить"}
          </Button>
        </div>
      </div>
    </div>
  );
}
