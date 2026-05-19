"use client";

import type { Game, LeagueMember, StatsFilter } from "@/lib/types";

interface StatsFiltersProps {
  games: Game[];
  members: LeagueMember[];
  filter: StatsFilter;
  onChange: (filter: StatsFilter) => void;
}

export function StatsFilters({ games, members, filter, onChange }: StatsFiltersProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">Период</label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Сегодня", from: today(), to: today() },
            { label: "Неделя", from: daysAgo(7), to: today() },
            { label: "Месяц", from: daysAgo(30), to: today() },
            { label: "Всё время", from: undefined, to: undefined },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                onChange({ ...filter, dateFrom: p.from, dateTo: p.to })
              }
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter.dateFrom === p.from && filter.dateTo === p.to
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">Игра</label>
        <select
          value={filter.gameId ?? ""}
          onChange={(e) =>
            onChange({ ...filter, gameId: e.target.value || undefined })
          }
          className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
        >
          <option value="">Все игры</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">
          Число игроков
        </label>
        <select
          value={filter.playerCount ?? ""}
          onChange={(e) =>
            onChange({
              ...filter,
              playerCount: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
          className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
        >
          <option value="">Любое</option>
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n} игроков
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">
          Точный состав (все вместе)
        </label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const selected = filter.rosterIds?.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const current = filter.rosterIds ?? [];
                  const next = selected
                    ? current.filter((id) => id !== m.id)
                    : [...current, m.id];
                  onChange({
                    ...filter,
                    rosterIds: next.length > 0 ? next : undefined,
                  });
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  selected
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-600/50"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {m.display_name}
              </button>
            );
          })}
        </div>
        {filter.rosterIds && filter.rosterIds.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            Учитываются только матчи с точно этим составом
          </p>
        )}
      </div>
    </div>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
