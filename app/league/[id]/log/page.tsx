import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getLeagueContext } from "@/lib/league-data";
import { Card } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

const actionLabels: Record<string, string> = {
  league_created: "Создана лига",
  member_joined: "Игрок вступил",
  win_added: "Добавлена победа",
  win_undone: "Победа отменена",
  participants_updated: "Обновлены участники",
  settings_updated: "Настройки изменены",
};

export default async function LogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, members } = await getLeagueContext(id);

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("league_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const memberMap = new Map(members.map((m) => [m.user_id, m.display_name]));

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Журнал</h1>
        <p className="text-sm text-zinc-400">Кто что и когда</p>
      </header>

      <ul className="space-y-2">
        {logs?.map((log) => (
          <li key={log.id}>
            <Card className="py-3">
              <div className="flex items-start gap-2">
                <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {actionLabels[log.action] ?? log.action}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {memberMap.get(log.actor_id) ?? "Игрок"} ·{" "}
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                  {log.action === "win_added" && (
                    <p className="mt-1 truncate text-xs text-zinc-400">
                      {(log.payload as { winner?: string })?.winner}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="py-8 text-center text-sm text-zinc-500">
            Журнал пуст
          </p>
        )}
      </ul>
    </main>
  );
}
