import { getLeagueContext } from "@/lib/league-data";
import { updateLeagueSettings } from "@/lib/actions/league";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { league, currentMember } = await getLeagueContext(id);

  if (currentMember.role !== "owner") {
    return (
      <main className="px-4 pt-6">
        <p className="text-zinc-400">Только создатель может менять настройки</p>
      </main>
    );
  }

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Настройки</h1>
      </header>

      <Card>
        <form
          action={updateLeagueSettings.bind(null, id)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Название</label>
            <Input name="name" defaultValue={league.name} required />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="elo_enabled"
              defaultChecked={league.elo_enabled}
              className="h-5 w-5 rounded border-zinc-600"
            />
            <div>
              <p className="font-medium">ELO (опционально)</p>
              <p className="text-xs text-zinc-500">
                Считать рейтинг ELO по играм и общий
              </p>
            </div>
          </label>

          <div>
            <label className="mb-1 block text-sm text-zinc-400">
              K-фактор ELO
            </label>
            <Input
              name="elo_k"
              type="number"
              min={8}
              max={64}
              defaultValue={league.elo_k}
            />
          </div>

          <Button type="submit" className="w-full">
            Сохранить
          </Button>
        </form>
      </Card>
    </main>
  );
}
