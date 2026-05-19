"use client";

import { cn } from "@/lib/utils";
import type { Game } from "@/lib/types";

interface GameTabsProps {
  games: Game[];
  activeId: string;
  onChange: (id: string) => void;
}

export function GameTabs({ games, activeId, onChange }: GameTabsProps) {
  if (games.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Добавьте игру на Арене
      </p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {games.map((game) => (
        <button
          key={game.id}
          type="button"
          onClick={() => onChange(game.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            activeId === game.id
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          )}
        >
          {game.name}
        </button>
      ))}
    </div>
  );
}
