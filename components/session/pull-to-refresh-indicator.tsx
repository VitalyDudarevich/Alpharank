"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PullToRefreshIndicatorProps = {
  pullDistance: number;
  refreshing: boolean;
};

/** Спиннер pull-to-refresh: подтягивается за пальцем и крутится при обновлении. */
export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !refreshing) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${Math.max(pullDistance - 8, 0)}px)` }}
    >
      <div className="mt-[calc(env(safe-area-inset-top)+0.5rem)] flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/95 shadow-lg">
        <Loader2
          className={cn("h-5 w-5 text-violet-400", refreshing && "animate-spin")}
          style={
            refreshing
              ? undefined
              : {
                  transform: `rotate(${pullDistance * 3}deg)`,
                  opacity: Math.min(pullDistance / 70, 1),
                }
          }
        />
      </div>
    </div>
  );
}
