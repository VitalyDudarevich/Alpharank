import type { MemberStats } from "@/lib/types";

export function StatsTable({ stats }: { stats: MemberStats[] }) {
  if (stats.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Нет данных по выбранным фильтрам
      </p>
    );
  }

  // Колонку «Очки» показываем только если в выборке есть умные бои.
  const hasPoints = stats.some((s) => s.points > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-zinc-500">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Игрок</th>
            {hasPoints && (
              <th className="px-4 py-3 font-medium text-right">Очки</th>
            )}
            <th className="px-4 py-3 font-medium text-right">Победы</th>
            <th className="px-4 py-3 font-medium text-right">Игр</th>
            <th className="px-4 py-3 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr
              key={s.member_id}
              className="border-b border-zinc-800/50 last:border-0"
            >
              <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-zinc-100">
                {s.display_name}
              </td>
              {hasPoints && (
                <td className="px-4 py-3 text-right font-bold text-amber-400">
                  {s.points}
                </td>
              )}
              <td className="px-4 py-3 text-right font-bold text-violet-400">
                {s.wins}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">
                {s.games_played}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">
                {s.win_rate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
