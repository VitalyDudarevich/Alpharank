"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import type { MemberStats } from "@/lib/types";

const COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface StatsChartsProps {
  stats: MemberStats[];
  timeline: Record<string, string | number>[];
}

export function StatsCharts({ stats, timeline }: StatsChartsProps) {
  const barData = stats.map((s) => ({
    name: s.display_name,
    wins: s.wins,
  }));

  const pieData = stats.filter((s) => s.wins > 0).map((s) => ({
    name: s.display_name,
    value: s.wins,
  }));

  return (
    <div className="space-y-6">
      <ChartCard title="Победы по игрокам">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 12,
              }}
            />
            <Bar dataKey="wins" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {pieData.length > 0 && (
        <ChartCard title="Доля побед">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {timeline.length > 1 && (
        <ChartCard title="Динамика побед">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timeline}>
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 12,
                }}
              />
              <Legend />
              {stats.map((s, i) => (
                <Line
                  key={s.member_id}
                  type="monotone"
                  dataKey={s.display_name}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-300">{title}</h3>
      {children}
    </div>
  );
}
