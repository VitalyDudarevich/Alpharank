import type { MemberStats } from "@/lib/types";

export function StatsTable({
  stats,
  showElo,
}: {
  stats: MemberStats[];
  showElo: boolean;
}) {
  if (stats.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        Нет данных по выбранным фильтрам
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-zinc-500">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Игрок</th>
            <th className="px-4 py-3 font-medium text-right">Победы</th>
            <th className="px-4 py-3 font-medium text-right">Игр</th>
            <th className="px-4 py-3 font-medium text-right">%</th>
            {showElo && <th className="px-4 py-3 font-medium text-right">ELO</th>}
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
              <td className="px-4 py-3 text-right font-bold text-violet-400">
                {s.wins}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">
                {s.games_played}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">
                {s.win_rate}%
              </td>
              {showElo && (
                <td className="px-4 py-3 text-right text-emerald-400">
                  {s.elo ? Math.round(s.elo) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
