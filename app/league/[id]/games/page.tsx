import { getLeagueContext } from "@/lib/league-data";
import { addGame, deleteGame } from "@/lib/actions/games";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gamepad2, Trash2 } from "lucide-react";

export default async function GamesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { games } = await getLeagueContext(id);

  return (
    <main className="px-4 pt-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Игры</h1>
        <p className="text-sm text-zinc-400">{games.length} в лиге</p>
      </header>

      <Card className="mb-6">
        <form action={addGame.bind(null, id)} className="flex gap-2">
          <Input name="name" placeholder="Название игры" required />
          <Button type="submit" size="sm">
            +
          </Button>
        </form>
      </Card>

      <ul className="space-y-2">
        {games.map((game) => (
          <li
            key={game.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
          >
            <span className="flex items-center gap-2 font-medium">
              <Gamepad2 className="h-4 w-4 text-violet-400" />
              {game.name}
            </span>
            <form action={deleteGame.bind(null, id, game.id)}>
              <button
                type="submit"
                className="text-zinc-600 hover:text-red-400"
                aria-label="Удалить"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </li>
        ))}
        {games.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            Добавьте первую игру
          </p>
        )}
      </ul>
    </main>
  );
}
